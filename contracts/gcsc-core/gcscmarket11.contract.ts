/**
 * gcscmarket11 - GCSC contractor lead marketplace MVP
 *
 * Fixed-price reservations + auctions. Sensitive homeowner/job data stays off-chain.
 * This contract stores opaque lead references, market state and deterministic settlement.
 */
import {
  Contract, Table, TableStore, Name, Asset, Symbol, check, requireAuth,
  isAccount, currentTimeSec, EMPTY_NAME, ActionData, InlineAction, PermissionLevel
} from "proton-tsc";

@packer
class Transfer extends ActionData {
  constructor(public from: Name=EMPTY_NAME, public to: Name=EMPTY_NAME,
    public quantity: Asset=new Asset(), public memo: string="") { super(); }
}
function sendTransfer(contract: Name, from: Name, to: Name, quantity: Asset, memo: string): void {
  new InlineAction<Transfer>("transfer").act(contract,new PermissionLevel(from))
    .send(new Transfer(from,to,quantity,memo));
}

const MODE_FIXED:u8=0, MODE_AUCTION:u8=1;
const LEAD_LISTED:u8=0, LEAD_RESERVED:u8=1, LEAD_CONVERTED:u8=2, LEAD_RETURNED:u8=3, LEAD_CANCELLED:u8=4;
const CLAIM_ACTIVE:u8=0, CLAIM_WON:u8=1, CLAIM_PARTIAL_REFUND:u8=2, CLAIM_DISPUTED:u8=3;

@table("config")
class Config extends Table {
  constructor(public admin:Name=EMPTY_NAME, public treasury:Name=EMPTY_NAME,
    public token_contract:Name=EMPTY_NAME, public token_symbol_raw:u64=0,
    public refund_bps:u32=5000, public default_claim_secs:u32=86400,
    public min_increment:i64=1, public paused:bool=false){super();}
  @primary get primary():u64{return 0;}
}

@table("leads")
class Lead extends Table {
  constructor(public id:u64=0, public owner:Name=EMPTY_NAME, public ref_hash:string="",
    public mode:u8=MODE_FIXED, public price:Asset=new Asset(), public status:u8=LEAD_LISTED,
    public auction_end:u32=0, public claim_secs:u32=0, public claimant:Name=EMPTY_NAME,
    public current_bid:Asset=new Asset(), public created_at:u32=0, public claim_expires:u32=0){super();}
  @primary get primary():u64{return this.id;}
}

@table("claims")
class Claim extends Table {
  constructor(public id:u64=0, public lead_id:u64=0, public contractor:Name=EMPTY_NAME,
    public committed:Asset=new Asset(), public refundable:i64=0, public retained:i64=0,
    public status:u8=CLAIM_ACTIVE, public created_at:u32=0, public settled_at:u32=0){super();}
  @primary get primary():u64{return this.id;}
  @secondary get by_lead():u64{return this.lead_id;}
  set by_lead(v:u64){this.lead_id=v;}
}

@contract
class gcscmarket11 extends Contract {
  configTable:TableStore<Config>=new TableStore<Config>(this.receiver);
  leadsTable:TableStore<Lead>=new TableStore<Lead>(this.receiver);
  claimsTable:TableStore<Claim>=new TableStore<Claim>(this.receiver);

  @action("setconfig")
  setconfig(admin:Name, treasury:Name, token_contract:Name, token_symbol:Symbol,
    refund_bps:u32, default_claim_secs:u32, min_increment:Asset):void {
    const c=this.getConfig(); requireAuth(c.admin==EMPTY_NAME?this.receiver:c.admin);
    check(isAccount(admin)&&isAccount(treasury)&&isAccount(token_contract),"account does not exist");
    check(refund_bps<=10000,"refund_bps must be <= 10000");
    check(default_claim_secs>=3600,"claim window must be at least 1 hour");
    check(min_increment.amount>0,"minimum increment must be positive");
    c.admin=admin;c.treasury=treasury;c.token_contract=token_contract;c.token_symbol_raw=token_symbol.value;
    c.refund_bps=refund_bps;c.default_claim_secs=default_claim_secs;c.min_increment=min_increment.amount;
    this.configTable.set(c,this.receiver);
  }

  @action("listlead")
  listlead(owner:Name, ref_hash:string, mode:u8, price:Asset, auction_end:u32, claim_secs:u32):void {
    requireAuth(owner); const c=this.getConfig(); check(!c.paused,"market paused");
    check(mode<=MODE_AUCTION,"invalid mode"); check(ref_hash.length>0,"reference required");
    check(price.amount>0&&price.symbol.value==c.token_symbol_raw,"invalid price");
    const now=<u32>currentTimeSec();
    if(mode==MODE_AUCTION) check(auction_end>now,"auction end must be future");
    const id=this.leadsTable.availablePrimaryKey;
    this.leadsTable.store(new Lead(id,owner,ref_hash,mode,price,LEAD_LISTED,auction_end,
      claim_secs>0?claim_secs:c.default_claim_secs,EMPTY_NAME,new Asset(0,price.symbol),now,0),owner);
  }

  @action("claimfixed")
  claimfixed(contractor:Name, lead_id:u64):void {
    requireAuth(contractor); const c=this.getConfig(); check(!c.paused,"market paused");
    const l=this.leadsTable.requireGet(lead_id,"lead not found");
    check(l.mode==MODE_FIXED&&l.status==LEAD_LISTED,"lead not available for fixed claim");
    sendTransfer(c.token_contract,contractor,this.receiver,l.price,"lead reservation");
    l.claimant=contractor;l.status=LEAD_RESERVED;l.current_bid=l.price;
    l.claim_expires=<u32>currentTimeSec()+l.claim_secs; this.leadsTable.update(l,this.receiver);
    this.newClaim(l,contractor,l.price);
  }

  @action("bid")
  bid(contractor:Name, lead_id:u64, amount:Asset):void {
    requireAuth(contractor); const c=this.getConfig(); check(!c.paused,"market paused");
    const l=this.leadsTable.requireGet(lead_id,"lead not found"); const now=<u32>currentTimeSec();
    check(l.mode==MODE_AUCTION&&l.status==LEAD_LISTED&&now<l.auction_end,"auction not open");
    check(amount.symbol.value==c.token_symbol_raw,"wrong symbol");
    const floor=l.current_bid.amount>0?l.current_bid.amount+c.min_increment:l.price.amount;
    check(amount.amount>=floor,"bid too low");
    // MVP: transfer new bid in; immediately refund previous bidder.
    sendTransfer(c.token_contract,contractor,this.receiver,amount,"lead auction bid");
    if(l.claimant!=EMPTY_NAME&&l.current_bid.amount>0)
      sendTransfer(c.token_contract,this.receiver,l.claimant,l.current_bid,"outbid refund");
    l.claimant=contractor;l.current_bid=amount;this.leadsTable.update(l,this.receiver);
  }

  @action("finalize")
  finalize(lead_id:u64):void {
    const c=this.getConfig(); check(!c.paused,"market paused");
    const l=this.leadsTable.requireGet(lead_id,"lead not found"); const now=<u32>currentTimeSec();
    check(l.mode==MODE_AUCTION&&l.status==LEAD_LISTED&&now>=l.auction_end,"auction not finalizable");
    check(l.claimant!=EMPTY_NAME&&l.current_bid.amount>0,"auction has no bids");
    l.status=LEAD_RESERVED;l.claim_expires=now+l.claim_secs;this.leadsTable.update(l,this.receiver);
    this.newClaim(l,l.claimant,l.current_bid);
  }

  @action("confirmclose")
  confirmclose(owner:Name, lead_id:u64):void {
    requireAuth(owner); const c=this.getConfig(); const l=this.leadsTable.requireGet(lead_id,"lead not found");
    check(owner==l.owner&&l.status==LEAD_RESERVED,"lead not reservable");
    const cl=this.activeClaim(lead_id); l.status=LEAD_CONVERTED; this.leadsTable.update(l,this.receiver);
    cl.status=CLAIM_WON;cl.settled_at=<u32>currentTimeSec();this.claimsTable.update(cl,this.receiver);
    sendTransfer(c.token_contract,this.receiver,c.treasury,cl.committed,"converted lead fee");
  }

  @action("expireclaim")
  expireclaim(lead_id:u64):void {
    const c=this.getConfig(); const l=this.leadsTable.requireGet(lead_id,"lead not found");
    check(l.status==LEAD_RESERVED&&<u32>currentTimeSec()>=l.claim_expires,"claim not expired");
    const cl=this.activeClaim(lead_id);
    const refund=(cl.committed.amount*<i64>c.refund_bps)/10000;
    const keep=cl.committed.amount-refund;
    if(refund>0) sendTransfer(c.token_contract,this.receiver,cl.contractor,new Asset(refund,cl.committed.symbol),"lead partial refund");
    if(keep>0) sendTransfer(c.token_contract,this.receiver,c.treasury,new Asset(keep,cl.committed.symbol),"lead access fee");
    cl.refundable=refund;cl.retained=keep;cl.status=CLAIM_PARTIAL_REFUND;cl.settled_at=<u32>currentTimeSec();
    this.claimsTable.update(cl,this.receiver);
    l.status=LEAD_RETURNED;l.claimant=EMPTY_NAME;l.current_bid=new Asset(0,l.price.symbol);l.claim_expires=0;
    // Returned lead becomes listed again immediately for MVP.
    l.status=LEAD_LISTED; if(l.mode==MODE_AUCTION) l.auction_end=<u32>currentTimeSec()+l.claim_secs;
    this.leadsTable.update(l,this.receiver);
  }

  @action("pause")
  pause(value:bool):void {const c=this.getConfig();requireAuth(c.admin);c.paused=value;this.configTable.set(c,this.receiver);}

  newClaim(l:Lead, contractor:Name, amount:Asset):void {
    const id=this.claimsTable.availablePrimaryKey;
    this.claimsTable.store(new Claim(id,l.id,contractor,amount,0,0,CLAIM_ACTIVE,<u32>currentTimeSec(),0),this.receiver);
  }
  activeClaim(lead_id:u64):Claim {
    let row=this.claimsTable.getBySecondaryU64(lead_id,0);
    while(row&&row.lead_id==lead_id){if(row.status==CLAIM_ACTIVE)return row;row=this.claimsTable.nextBySecondaryU64(row,0);}
    check(false,"active claim not found");return new Claim();
  }
  getConfig():Config {let c=this.configTable.get(0);if(!c){c=new Config();c.admin=this.receiver;this.configTable.store(c,this.receiver);}return c;}
}