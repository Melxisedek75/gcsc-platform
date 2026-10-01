export {};
const fs = require("fs"), path = require("path");
const { COMPILER_TIMEOUT_MS, createScratchDirectory, runProtonAsc } = require("./harness.cjs");
const { expect } = require("chai");
const { Asset, Name, TimePointSec } = require("@greymass/eosio");
const { Blockchain, protonAssert, nameToBigInt, symbolCodeToBigInt } = require("@proton/vert");
const CORE = path.resolve(__dirname, "..");
const GENERATED = createScratchDirectory(CORE, "gcscmarket11");
const MARKET = "gcscmarket11", TOKEN = "gcsctoken111";
const ADMIN = "admin", OWNER = "homeowner", TREASURY = "treasury", OTHER_TREASURY = "othertreas";
const ALICE = "alice", BOB = "bob", START = 1000, WINDOW = 3600, END = 1100;
const SYMBOL = "4,USD", PRICE = "40.0000 USD";
interface Harness { blockchain: any; market: any; token: any; }
let marketAbi: any, marketWasm: Uint8Array, tokenAbi: any, tokenWasm: Uint8Array;

function findArtifact(root: string, name: string): string {
    for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
        const full = path.join(root, entry.name);
        if (entry.isFile() && entry.name === name) return full;
        if (entry.isDirectory()) { const found = findArtifact(full, name); if (found) return found; }
    }
    return "";
}
function build(name: string, tokenFixture = false): { abi: any; wasm: Uint8Array } {
    const dir = path.join(GENERATED, name);
    fs.mkdirSync(dir, { recursive: true });
    let source = fs.readFileSync(path.join(CORE, name + ".contract.ts"), "utf8");
    // Same transfer-dispatch fixture as the existing escrow tests.
    // The market source is compiled without any transformations.
    if (tokenFixture) source = source.replace('@action("transfer", notify)', '@action("transfer")');
    const file = path.join(dir, name + ".contract.ts");
    fs.writeFileSync(file, source); runProtonAsc(file);
    const abi = findArtifact(path.join(dir, "target"), name + ".contract.abi");
    const wasm = findArtifact(path.join(dir, "target"), name + ".contract.wasm");
    expect(abi, "ABI artifact").to.not.equal("");
    expect(wasm, "WASM artifact").to.not.equal("");
    return { abi: JSON.parse(fs.readFileSync(abi, "utf8")), wasm: fs.readFileSync(wasm) };
}
async function config(h: Harness, refund = 5000, treasury = TREASURY, token = TOKEN,
    symbol = SYMBOL, increment = "1.0000 USD", authority = ADMIN): Promise<void> {
    await h.market.actions.setconfig([ADMIN, treasury, token, symbol, refund, WINDOW, increment]).send(authority);
}
async function harness(refund = 5000): Promise<Harness> {
    const blockchain = new Blockchain(); blockchain.setTime(TimePointSec.from(START));
    const token = blockchain.createAccount({ name: TOKEN, abi: tokenAbi, wasm: tokenWasm });
    const market = blockchain.createAccount({ name: MARKET, abi: marketAbi, wasm: marketWasm, enableInline: true });
    blockchain.createAccounts(ADMIN, OWNER, TREASURY, OTHER_TREASURY, ALICE, BOB, "othertoken");
    const h = { blockchain, token, market };
    await token.actions.create([ADMIN, "461168601842738.7903 USD"]).send(TOKEN);
    await token.actions.issue([ALICE, "1000.0000 USD", "local fixture"]).send(ADMIN);
    await token.actions.issue([BOB, "1000.0000 USD", "local fixture"]).send(ADMIN);
    await config(h, refund, TREASURY, TOKEN, SYMBOL, "1.0000 USD", MARKET);
    return h;
}
async function list(h: Harness, mode = 0, price = PRICE, window = WINDOW): Promise<void> {
    await h.market.actions.listlead([OWNER, "opaque-lead-ref", mode, price, mode ? END : 0, window]).send(OWNER);
}
async function reserve(h: Harness, actor = ALICE, id = 0): Promise<void> {
    await h.token.actions.transfer([actor, MARKET, row(h, "leads", id).price, "claim:" + id]).send(actor);
}
function row(h: Harness, table: string, id = 0): any { return h.market.tables[table]().getTableRow(BigInt(id)); }
function balance(h: Harness, account: string): string {
    const scope = nameToBigInt(Name.from(account)), code = symbolCodeToBigInt(Asset.SymbolCode.from("USD"));
    return h.token.tables.accounts(scope).getTableRow(code)?.balance || "0.0000 USD";
}
function at(h: Harness, time: number): void { h.blockchain.setTime(TimePointSec.from(time)); }
async function rejects(promise: Promise<void>, message: string): Promise<void> {
    try { await promise; } catch (err: any) { expect(err.message).to.equal(protonAssert(message)); return; }
    throw new Error("Expected rejection: " + message);
}

describe("gcscmarket11 lead marketplace behavior", function () {
    this.timeout(120000);
    before(function () {
        this.timeout(2 * COMPILER_TIMEOUT_MS + 30000);
        const market = build(MARKET), token = build(TOKEN, true);
        marketAbi = market.abi; marketWasm = market.wasm; tokenAbi = token.abi; tokenWasm = token.wasm;
    });
    it("compiles the unchanged market source including finalize", () => {
        expect(marketAbi.actions.map((a: any) => a.name)).to.include("finalize");
        expect(marketWasm.length).to.be.greaterThan(0);
    });
    it("reserves a fixed lead and holds exactly the quoted amount", async () => {
        const h = await harness(); await list(h); await reserve(h);
        expect(row(h, "leads").status).to.equal(1);
        expect(row(h, "leads").claimant).to.equal(ALICE);
        expect(row(h, "leads").claim_expires).to.equal(START + WINDOW);
        expect(row(h, "claims").committed).to.equal(PRICE);
        expect(balance(h, ALICE)).to.equal("960.0000 USD");
        expect(balance(h, MARKET)).to.equal(PRICE);
    });
    it("rejects duplicate reservation without charging the second contractor", async () => {
        const h = await harness(); await list(h); await reserve(h);
        await rejects(reserve(h, BOB), "lead not available for fixed claim");
        expect(balance(h, BOB)).to.equal("1000.0000 USD");
        expect(balance(h, MARKET)).to.equal(PRICE);
    });
    it("rolls back reservation when funds are insufficient", async () => {
        const h = await harness(); await list(h, 0, "1001.0000 USD");
        await rejects(reserve(h), "overdrawn balance");
        expect(row(h, "leads").status).to.equal(0);
        expect(row(h, "claims")).to.equal(undefined);
        expect(balance(h, ALICE)).to.equal("1000.0000 USD");
    });
    it("requires the contractor's authorization", async () => {
        const h = await harness(); await list(h);
        try { await h.token.actions.transfer([ALICE, MARKET, PRICE, "claim:0"]).send(BOB); }
        catch (err: any) { expect(err.message).to.include("missing required authority alice"); return; }
        throw new Error("Unauthorized reservation succeeded");
    });
    it("enforces opening price and minimum bid increment", async () => {
        const h = await harness(); await list(h, 1);
        await rejects(h.token.actions.transfer([ALICE, MARKET, "39.0000 USD", "bid:0"]).send(ALICE), "bid too low");
        await h.token.actions.transfer([ALICE, MARKET, PRICE, "bid:0"]).send(ALICE);
        await rejects(h.token.actions.transfer([BOB, MARKET, "40.9999 USD", "bid:0"]).send(BOB), "bid too low");
        expect(balance(h, MARKET)).to.equal(PRICE);
    });
    it("returns the previous bid in full when outbid", async () => {
        const h = await harness(); await list(h, 1);
        await h.token.actions.transfer([ALICE, MARKET, PRICE, "bid:0"]).send(ALICE);
        await h.token.actions.transfer([BOB, MARKET, "41.0000 USD", "bid:0"]).send(BOB);
        expect(balance(h, ALICE)).to.equal("1000.0000 USD");
        expect(balance(h, BOB)).to.equal("959.0000 USD");
        expect(balance(h, MARKET)).to.equal("41.0000 USD");
        expect(row(h, "leads").claimant).to.equal(BOB);
    });
    it("allows a bidder to raise its bid without locking both amounts", async () => {
        const h = await harness(); await list(h, 1);
        await h.token.actions.transfer([ALICE, MARKET, PRICE, "bid:0"]).send(ALICE);
        await h.token.actions.transfer([ALICE, MARKET, "41.0000 USD", "bid:0"]).send(ALICE);
        expect(balance(h, ALICE)).to.equal("959.0000 USD");
        expect(balance(h, MARKET)).to.equal("41.0000 USD");
    });
    it("finalizes at the deadline and rejects a bid at the deadline", async () => {
        const h = await harness(); await list(h, 1);
        await h.token.actions.transfer([ALICE, MARKET, PRICE, "bid:0"]).send(ALICE);
        await rejects(h.market.actions.finalize([0]).send(BOB), "auction not finalizable");
        at(h, END);
        await rejects(h.token.actions.transfer([BOB, MARKET, "41.0000 USD", "bid:0"]).send(BOB), "auction not open");
        await h.market.actions.finalize([0]).send(BOB);
        expect(row(h, "leads").status).to.equal(1);
        expect(row(h, "leads").claim_expires).to.equal(END + WINDOW);
        expect(row(h, "claims").contractor).to.equal(ALICE);
    });
    it("rejects finalization of an auction without bids", async () => {
        const h = await harness(); await list(h, 1); at(h, END);
        await rejects(h.market.actions.finalize([0]).send(BOB), "auction has no bids");
    });
    it("converts once and transfers the fee to treasury", async () => {
        const h = await harness(); await list(h); await reserve(h);
        await h.market.actions.confirmclose([OWNER, 0]).send(OWNER);
        expect(row(h, "leads").status).to.equal(2); expect(row(h, "claims").status).to.equal(1);
        expect(balance(h, TREASURY)).to.equal(PRICE); expect(balance(h, MARKET)).to.equal("0.0000 USD");
        await rejects(h.market.actions.confirmclose([OWNER, 0]).send(OWNER), "lead not reservable");
    });
    it("rejects conversion by a different lead owner", async () => {
        const h = await harness(); await list(h); await reserve(h);
        await rejects(h.market.actions.confirmclose([BOB, 0]).send(BOB), "lead not reservable");
        expect(balance(h, MARKET)).to.equal(PRICE);
    });
    it("rejects conversion after the claim deadline", async () => {
        const h = await harness(); await list(h); await reserve(h); at(h, START + WINDOW);
        await rejects(h.market.actions.confirmclose([OWNER, 0]).send(OWNER), "claim expired");
        expect(balance(h, TREASURY)).to.equal("0.0000 USD");
    });
    it("rejects early expiry, refunds at the deadline, and prevents double refunds", async () => {
        const h = await harness(); await list(h); await reserve(h);
        await rejects(h.market.actions.expireclaim([0]).send(BOB), "claim not expired");
        at(h, START + WINDOW); await h.market.actions.expireclaim([0]).send(BOB);
        expect(balance(h, ALICE)).to.equal("980.0000 USD"); expect(balance(h, TREASURY)).to.equal("20.0000 USD");
        expect(balance(h, MARKET)).to.equal("0.0000 USD");
        expect(row(h, "leads").status).to.equal(0); expect(row(h, "claims").status).to.equal(2);
        await rejects(h.market.actions.expireclaim([0]).send(BOB), "claim not expired");
    });
    it("selects the new active claim after relisting", async () => {
        const h = await harness(); await list(h); await reserve(h);
        at(h, START + WINDOW); await h.market.actions.expireclaim([0]).send(BOB);
        await reserve(h, BOB); await h.market.actions.confirmclose([OWNER, 0]).send(OWNER);
        expect(row(h, "claims", 0).status).to.equal(2); expect(row(h, "claims", 1).status).to.equal(1);
        expect(balance(h, TREASURY)).to.equal("60.0000 USD");
    });
    it("reopens an expired auction and clears its old bid", async () => {
        const h = await harness(); await list(h, 1);
        await h.token.actions.transfer([ALICE, MARKET, PRICE, "bid:0"]).send(ALICE); at(h, END);
        await h.market.actions.finalize([0]).send(BOB); at(h, END + WINDOW);
        await h.market.actions.expireclaim([0]).send(BOB);
        expect(row(h, "leads").auction_end).to.equal(END + 2 * WINDOW);
        expect(row(h, "leads").current_bid).to.equal("0.0000 USD");
        await h.token.actions.transfer([BOB, MARKET, PRICE, "bid:0"]).send(BOB); expect(balance(h, MARKET)).to.equal(PRICE);
    });
    it("preserves the listed refund policy when config changes before reservation", async () => {
        const h = await harness(); await list(h); await config(h, 0); await reserve(h);
        at(h, START + WINDOW); await h.market.actions.expireclaim([0]).send(BOB);
        expect(balance(h, ALICE)).to.equal("980.0000 USD");
    });
    it("preserves the reserved refund policy and treasury after config changes", async () => {
        const h = await harness(); await list(h); await reserve(h); await config(h, 0, OTHER_TREASURY);
        at(h, START + WINDOW); await h.market.actions.expireclaim([0]).send(BOB);
        expect(balance(h, ALICE)).to.equal("980.0000 USD"); expect(balance(h, TREASURY)).to.equal("20.0000 USD");
        expect(balance(h, OTHER_TREASURY)).to.equal("0.0000 USD");
    });
    it("prevents settlement token changes that could strand funds", async () => {
        const h = await harness(); await list(h); await reserve(h);
        await rejects(config(h, 5000, TREASURY, "othertoken"), "settlement token is immutable");
        await rejects(config(h, 5000, TREASURY, TOKEN, "4,ALT", "1.0000 ALT"), "settlement token is immutable");
        expect(balance(h, MARKET)).to.equal(PRICE);
    });
    for (const refund of [0, 10000]) {
        it("handles the " + refund + " bps refund boundary", async () => {
            const h = await harness(refund); await list(h); await reserve(h);
            at(h, START + WINDOW); await h.market.actions.expireclaim([0]).send(BOB);
            expect(balance(h, ALICE)).to.equal(refund ? "1000.0000 USD" : "960.0000 USD");
            expect(balance(h, TREASURY)).to.equal(refund ? "0.0000 USD" : PRICE);
        });
    }
    it("rounds refund down and conserves the smallest currency unit", async () => {
        const h = await harness(); await list(h, 0, "0.0003 USD"); await reserve(h);
        at(h, START + WINDOW); await h.market.actions.expireclaim([0]).send(BOB);
        expect(balance(h, ALICE)).to.equal("999.9998 USD"); expect(balance(h, TREASURY)).to.equal("0.0002 USD");
        expect(row(h, "claims").refundable).to.equal(1); expect(row(h, "claims").retained).to.equal(2);
    });
    it("calculates large valid refunds without signed integer overflow", async () => {
        const h = await harness(), amount = "400000000000000.0000 USD";
        await h.token.actions.issue([ALICE, amount, "overflow boundary fixture"]).send(ADMIN);
        await list(h, 0, amount); await reserve(h); at(h, START + WINDOW);
        await h.market.actions.expireclaim([0]).send(BOB);
        expect(balance(h, TREASURY)).to.equal("200000000000000.0000 USD");
        expect(balance(h, ALICE)).to.equal("200000000001000.0000 USD"); expect(balance(h, MARKET)).to.equal("0.0000 USD");
    });
    it("pauses new commitments while keeping expired refunds available", async () => {
        const h = await harness(); await list(h); await reserve(h); await h.market.actions.pause([true]).send(ADMIN);
        await rejects(list(h), "market paused"); at(h, START + WINDOW);
        await h.market.actions.expireclaim([0]).send(BOB); expect(balance(h, ALICE)).to.equal("980.0000 USD");
    });
    it("rejects a minimum increment with a different symbol", async () => {
        const h = await harness();
        await rejects(config(h, 5000, TREASURY, TOKEN, SYMBOL, "1.0000 ALT"), "invalid minimum increment");
    });
    it("rejects a short claim window override", async () => {
        const h = await harness(); await rejects(list(h, 0, PRICE, 1), "claim window must be at least 1 hour");
    });
    it("uses the default claim window for a zero override", async () => {
        const h = await harness(); await list(h, 0, PRICE, 0); await reserve(h);
        expect(row(h, "leads").claim_expires).to.equal(START + WINDOW);
    });
    it("rejects claim deadline timestamp overflow", async () => {
        const h = await harness(); await rejects(list(h, 0, PRICE, 4294967295), "claim deadline overflow");
    });
    it("rejects a listing with the wrong settlement symbol", async () => {
        const h = await harness(); await rejects(list(h, 0, "40.0000 ALT"), "invalid price");
    });
    it("rejects a bid with the wrong settlement symbol", async () => {
        const h = await harness(); await list(h, 1);
        await h.token.actions.create([ADMIN, "1000000.0000 ALT"]).send(TOKEN);
        await h.token.actions.issue([ALICE, "1000.0000 ALT", "wrong symbol fixture"]).send(ADMIN);
        await rejects(h.token.actions.transfer([ALICE, MARKET, "41.0000 ALT", "bid:0"]).send(ALICE), "wrong symbol");
        expect(balance(h, ALICE)).to.equal("1000.0000 USD");
    });
    it("preserves the listed bid increment after config changes", async () => {
        const h = await harness(); await list(h, 1);
        await config(h, 5000, TREASURY, TOKEN, SYMBOL, "10.0000 USD");
        await h.token.actions.transfer([ALICE, MARKET, PRICE, "bid:0"]).send(ALICE);
        await h.token.actions.transfer([BOB, MARKET, "41.0000 USD", "bid:0"]).send(BOB);
        expect(balance(h, MARKET)).to.equal("41.0000 USD");
    });
    it("rejects notifications from an unapproved token contract", async () => {
        const h = await harness(); await list(h);
        const fake = h.blockchain.getAccount(Name.from("othertoken"));
        fake.setContract(tokenAbi, tokenWasm);
        await fake.actions.create([ADMIN, "1000000.0000 USD"]).send("othertoken");
        await fake.actions.issue([ALICE, "1000.0000 USD", "fake fixture"]).send(ADMIN);
        await rejects(fake.actions.transfer([ALICE, MARKET, PRICE, "claim:0"]).send(ALICE), "unsupported token contract");
        expect(row(h, "leads").status).to.equal(0);
        expect(row(h, "claims")).to.equal(undefined);
        expect(balance(h, MARKET)).to.equal("0.0000 USD");
    });
    for (const memo of ["", "deposit", "claim:0:extra", "claim:-1", "claim:abc", "claim:18446744073709551616"]) {
        it("rolls back payment with invalid memo " + JSON.stringify(memo), async () => {
            const h = await harness(); await list(h);
            await rejects(h.token.actions.transfer([ALICE, MARKET, PRICE, memo]).send(ALICE),
                memo.split(":").length === 2 ? "invalid lead id" : "invalid payment memo");
            expect(balance(h, ALICE)).to.equal("1000.0000 USD");
            expect(balance(h, MARKET)).to.equal("0.0000 USD");
        });
    }
    it("rejects incorrect fixed payment without retaining it", async () => {
        const h = await harness(); await list(h);
        await rejects(h.token.actions.transfer([ALICE, MARKET, "39.0000 USD", "claim:0"]).send(ALICE), "incorrect fixed payment");
        expect(balance(h, ALICE)).to.equal("1000.0000 USD");
    });
    it("requires admin authorization to update financial policy", async () => {
        const h = await harness();
        try { await config(h, 0, TREASURY, TOKEN, SYMBOL, "1.0000 USD", BOB); }
        catch (err: any) { expect(err.message).to.include("missing required authority admin"); return; }
        throw new Error("Unauthorized config change succeeded");
    });
    it("does not expose unfunded reservation or bid actions", () => {
        const names = marketAbi.actions.map((a: any) => a.name);
        expect(names).to.not.include.members(["claimfixed", "bid", "claimFixed", "placeBid"]);
    });
    it("keeps private homeowner fields out of serialized tables", () => {
        for (const table of marketAbi.tables) {
            const schema = marketAbi.structs.find((s: any) => s.name === table.type);
            expect(schema.fields.map((f: any) => f.name)).to.not.include.members(["phone", "email", "address"]);
        }
    });
});
