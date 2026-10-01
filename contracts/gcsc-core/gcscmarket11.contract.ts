/**
 * gcscmarket11 - GCSC contractor lead marketplace MVP.
 *
 * Settlement arrives through the configured token's transfer notification.
 * Memo: claim:<lead_id> or bid:<lead_id>. No user permission delegation.
 * Homeowner/job data remains off-chain; references are opaque identifiers.
 */
import {
  Contract, Table, TableStore, Name, Asset, Symbol, check, requireAuth,
  isAccount, currentTimeSec, EMPTY_NAME, ActionData, InlineAction, PermissionLevel
} from "proton-tsc";

@packer
class Transfer extends ActionData {
  constructor(public from: Name = EMPTY_NAME, public to: Name = EMPTY_NAME,
    public quantity: Asset = new Asset(), public memo: string = "") { super(); }
}
function sendTransfer(contract: Name, from: Name, to: Name, quantity: Asset, memo: string): void {
  new InlineAction<Transfer>("transfer").act(contract, new PermissionLevel(from))
    .send(new Transfer(from, to, quantity, memo));
}

const MODE_FIXED: u8 = 0, MODE_AUCTION: u8 = 1;
const LEAD_LISTED: u8 = 0, LEAD_RESERVED: u8 = 1, LEAD_CONVERTED: u8 = 2;
const CLAIM_ACTIVE: u8 = 0, CLAIM_WON: u8 = 1, CLAIM_PARTIAL_REFUND: u8 = 2;

@table("config")
class Config extends Table {
  constructor(public admin: Name = EMPTY_NAME, public treasury: Name = EMPTY_NAME,
    public token_contract: Name = EMPTY_NAME, public token_symbol_raw: u64 = 0,
    public refund_bps: u32 = 5000, public default_claim_secs: u32 = 86400,
    public min_increment: i64 = 1, public paused: bool = false) { super(); }
  @primary get primary(): u64 { return 0; }
}

@table("leads")
class Lead extends Table {
  constructor(public id: u64 = 0, public owner: Name = EMPTY_NAME, public ref_hash: string = "",
    public mode: u8 = MODE_FIXED, public price: Asset = new Asset(), public status: u8 = LEAD_LISTED,
    public auction_end: u32 = 0, public claim_secs: u32 = 0, public claimant: Name = EMPTY_NAME,
    public current_bid: Asset = new Asset(), public created_at: u32 = 0, public claim_expires: u32 = 0,
    public refund_bps: u32 = 5000, public treasury: Name = EMPTY_NAME,
    public min_increment: i64 = 1) { super(); }
  @primary get primary(): u64 { return this.id; }
}

@table("claims")
class Claim extends Table {
  constructor(public id: u64 = 0, public lead_id: u64 = 0, public contractor: Name = EMPTY_NAME,
    public committed: Asset = new Asset(), public refundable: i64 = 0, public retained: i64 = 0,
    public status: u8 = CLAIM_ACTIVE, public created_at: u32 = 0, public settled_at: u32 = 0,
    public refund_bps: u32 = 5000, public treasury: Name = EMPTY_NAME) { super(); }
  @primary get primary(): u64 { return this.id; }
  @secondary get by_lead(): u64 { return this.lead_id; }
  set by_lead(v: u64) { this.lead_id = v; }
}

@contract
class gcscmarket11 extends Contract {
  configTable: TableStore<Config> = new TableStore<Config>(this.receiver);
  leadsTable: TableStore<Lead> = new TableStore<Lead>(this.receiver);
  claimsTable: TableStore<Claim> = new TableStore<Claim>(this.receiver);

  @action("setconfig")
  setconfig(admin: Name, treasury: Name, token_contract: Name, token_symbol: Symbol,
    refund_bps: u32, default_claim_secs: u32, min_increment: Asset): void {
    const c = this.getConfig();
    requireAuth(c.admin == EMPTY_NAME ? this.receiver : c.admin);
    check(isAccount(admin) && isAccount(treasury) && isAccount(token_contract), "account does not exist");
    check(treasury != this.receiver, "treasury cannot be market");
    check(token_symbol.isValid(), "invalid settlement symbol");
    if (c.token_symbol_raw != 0) {
      check(token_contract == c.token_contract && token_symbol.value == c.token_symbol_raw,
        "settlement token is immutable");
    }
    check(refund_bps <= 10000, "refund_bps must be <= 10000");
    check(default_claim_secs >= 3600, "claim window must be at least 1 hour");
    check(min_increment.isValid() && min_increment.amount > 0 &&
      min_increment.symbol.value == token_symbol.value, "invalid minimum increment");
    c.admin = admin; c.treasury = treasury; c.token_contract = token_contract;
    c.token_symbol_raw = token_symbol.value; c.refund_bps = refund_bps;
    c.default_claim_secs = default_claim_secs; c.min_increment = min_increment.amount;
    this.configTable.set(c, this.receiver);
  }

  @action("listlead")
  listlead(owner: Name, ref_hash: string, mode: u8, price: Asset, auction_end: u32, claim_secs: u32): void {
    requireAuth(owner);
    const c = this.getConfig(); check(!c.paused, "market paused");
    check(mode <= MODE_AUCTION, "invalid mode");
    check(ref_hash.length > 0 && ref_hash.length <= 128, "invalid opaque reference");
    check(price.isValid() && price.amount > 0 && price.symbol.value == c.token_symbol_raw, "invalid price");
    const now = <u32>currentTimeSec();
    const window = claim_secs > 0 ? claim_secs : c.default_claim_secs;
    check(window >= 3600, "claim window must be at least 1 hour");
    this.deadline(now, window);
    if (mode == MODE_AUCTION) {
      check(auction_end > now, "auction end must be future");
      this.deadline(auction_end, window);
    }
    const id = this.leadsTable.availablePrimaryKey;
    this.leadsTable.store(new Lead(id, owner, ref_hash, mode, price, LEAD_LISTED, auction_end,
      window, EMPTY_NAME, new Asset(0, price.symbol), now, 0, c.refund_bps, c.treasury, c.min_increment), owner);
  }

  @action("transfer", notify)
  onTransfer(from: Name, to: Name, quantity: Asset, memo: string): void {
    if (from == this.receiver || to != this.receiver) return;
    const c = this.getConfig();
    check(!c.paused, "market paused");
    check(this.firstReceiver == c.token_contract, "unsupported token contract");
    check(quantity.isValid() && quantity.amount > 0, "invalid payment");
    check(quantity.symbol.value == c.token_symbol_raw, "wrong symbol");
    check(from != c.treasury, "treasury cannot claim leads");
    const parts = memo.split(":");
    check(parts.length == 2 && (parts[0] == "claim" || parts[0] == "bid"), "invalid payment memo");
    const id = this.parseLeadId(parts[1]);
    if (parts[0] == "claim") this.claimFixed(from, id, quantity);
    else this.placeBid(from, id, quantity);
  }

  // Only called after a validated token-transfer notification. Never public actions.
  claimFixed(contractor: Name, lead_id: u64, amount: Asset): void {
    const l = this.leadsTable.requireGet(lead_id, "lead not found");
    check(l.mode == MODE_FIXED && l.status == LEAD_LISTED, "lead not available for fixed claim");
    check(amount.amount == l.price.amount, "incorrect fixed payment");
    check(contractor != l.owner && contractor != l.treasury, "lead parties cannot claim");
    const now = <u32>currentTimeSec();
    l.claim_expires = this.deadline(now, l.claim_secs);
    l.claimant = contractor; l.status = LEAD_RESERVED; l.current_bid = amount;
    this.leadsTable.update(l, this.receiver);
    this.newClaim(l, contractor, amount);
  }

  placeBid(contractor: Name, lead_id: u64, amount: Asset): void {
    const l = this.leadsTable.requireGet(lead_id, "lead not found");
    const now = <u32>currentTimeSec();
    check(l.mode == MODE_AUCTION && l.status == LEAD_LISTED && now < l.auction_end, "auction not open");
    check(contractor != l.owner && contractor != l.treasury, "lead parties cannot bid");
    const floor = l.current_bid.amount > 0 ? l.current_bid.amount + l.min_increment : l.price.amount;
    check(amount.amount >= floor, "bid too low");
    const previous = l.claimant, previousBid = l.current_bid;
    l.claimant = contractor; l.current_bid = amount;
    this.leadsTable.update(l, this.receiver);
    if (previous != EMPTY_NAME && previousBid.amount > 0) {
      sendTransfer(this.getConfig().token_contract, this.receiver, previous, previousBid, "outbid refund");
    }
  }

  @action("finalize")
  finalizeAuction(lead_id: u64): void {
    const c = this.getConfig(); check(!c.paused, "market paused");
    const l = this.leadsTable.requireGet(lead_id, "lead not found");
    const now = <u32>currentTimeSec();
    check(l.mode == MODE_AUCTION && l.status == LEAD_LISTED && now >= l.auction_end, "auction not finalizable");
    check(l.claimant != EMPTY_NAME && l.current_bid.amount > 0, "auction has no bids");
    l.claim_expires = this.deadline(now, l.claim_secs);
    l.status = LEAD_RESERVED; this.leadsTable.update(l, this.receiver);
    this.newClaim(l, l.claimant, l.current_bid);
  }

  @action("confirmclose")
  confirmclose(owner: Name, lead_id: u64): void {
    requireAuth(owner);
    const l = this.leadsTable.requireGet(lead_id, "lead not found");
    check(owner == l.owner && l.status == LEAD_RESERVED, "lead not reservable");
    check(<u32>currentTimeSec() < l.claim_expires, "claim expired");
    const cl = this.activeClaim(lead_id);
    l.status = LEAD_CONVERTED; this.leadsTable.update(l, this.receiver);
    cl.status = CLAIM_WON; cl.retained = cl.committed.amount;
    cl.settled_at = <u32>currentTimeSec(); this.claimsTable.update(cl, this.receiver);
    sendTransfer(this.getConfig().token_contract, this.receiver, cl.treasury, cl.committed, "converted lead fee");
  }

  @action("expireclaim")
  expireclaim(lead_id: u64): void {
    const l = this.leadsTable.requireGet(lead_id, "lead not found");
    const now = <u32>currentTimeSec();
    check(l.status == LEAD_RESERVED && now >= l.claim_expires, "claim not expired");
    const cl = this.activeClaim(lead_id);
    // Quotient/remainder avoids overflowing i64 at valid asset amounts.
    const refund = (cl.committed.amount / 10000) * <i64>cl.refund_bps +
      ((cl.committed.amount % 10000) * <i64>cl.refund_bps) / 10000;
    const keep = cl.committed.amount - refund;
    cl.refundable = refund; cl.retained = keep; cl.status = CLAIM_PARTIAL_REFUND; cl.settled_at = now;
    this.claimsTable.update(cl, this.receiver);
    l.claimant = EMPTY_NAME; l.current_bid = new Asset(0, l.price.symbol); l.claim_expires = 0;
    l.status = LEAD_LISTED;
    // Never let an unrepresentable future auction deadline prevent an owed refund.
    if (l.mode == MODE_AUCTION) l.auction_end =
      <u64>now + <u64>l.claim_secs <= <u64>u32.MAX_VALUE ? now + l.claim_secs : u32.MAX_VALUE;
    this.leadsTable.update(l, this.receiver);
    const c = this.getConfig();
    if (refund > 0) sendTransfer(c.token_contract, this.receiver, cl.contractor,
      new Asset(refund, cl.committed.symbol), "lead partial refund");
    if (keep > 0) sendTransfer(c.token_contract, this.receiver, cl.treasury,
      new Asset(keep, cl.committed.symbol), "lead access fee");
  }

  @action("pause")
  pause(value: bool): void {
    const c = this.getConfig(); requireAuth(c.admin);
    c.paused = value; this.configTable.set(c, this.receiver);
  }

  deadline(now: u32, seconds: u32): u32 {
    check(<u64>now + <u64>seconds <= <u64>u32.MAX_VALUE, "claim deadline overflow");
    return now + seconds;
  }
  parseLeadId(value: string): u64 {
    check(value.length > 0 && value.length <= 20, "invalid lead id");
    let id: u64 = 0;
    for (let i = 0; i < value.length; i++) {
      const code = value.charCodeAt(i);
      check(code >= 48 && code <= 57, "invalid lead id");
      const digit = <u64>(code - 48);
      check(id <= (u64.MAX_VALUE - digit) / 10, "invalid lead id");
      id = id * 10 + digit;
    }
    return id;
  }
  newClaim(l: Lead, contractor: Name, amount: Asset): void {
    const id = this.claimsTable.availablePrimaryKey;
    this.claimsTable.store(new Claim(id, l.id, contractor, amount, 0, 0, CLAIM_ACTIVE,
      <u32>currentTimeSec(), 0, l.refund_bps, l.treasury), this.receiver);
  }
  activeClaim(lead_id: u64): Claim {
    let row = this.claimsTable.getBySecondaryU64(lead_id, 0);
    while (row && row.lead_id == lead_id) {
      if (row.status == CLAIM_ACTIVE) return row;
      row = this.claimsTable.nextBySecondaryU64(row, 0);
    }
    check(false, "active claim not found"); return new Claim();
  }
  getConfig(): Config {
    let c = this.configTable.get(0);
    if (!c) { c = new Config(); c.admin = this.receiver; this.configTable.store(c, this.receiver); }
    return c;
  }
}
