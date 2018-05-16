class FakeRand {
    constructor(seed) { this.seed = seed; }
    rand() {
        this.seed = (0x5DEECE66D * this.seed + 0xB) % (1 << 48);
        return this.seed;
    }
}
var Direction;
(function (Direction) {
    Direction[Direction["Up"] = 1] = "Up";
    Direction[Direction["Down"] = 2] = "Down";
    Direction[Direction["Left"] = 3] = "Left";
    Direction[Direction["Right"] = 4] = "Right";
})(Direction || (Direction = {}));
;
/**
 * Position
 */
class Pos {
    constructor(x, y) { this.x = x; this.y = y; }
    clone() { return new Pos(this.x, this.y); }
}
/**
 * Tile which has numbers on it.
 */
class Tile {
    constructor(pos, val) { this.pos = pos; this.val = val; }
    clone() { return new Tile(this.pos.clone(), this.val); }
}
var Action;
(function (Action) {
    Action[Action["None"] = 0] = "None";
    Action[Action["Move"] = 1] = "Move";
    Action[Action["Merged"] = 2] = "Merged";
    Action[Action["MergeOther"] = 4] = "MergeOther";
})(Action || (Action = {}));
/**
 * TileAction
 */
class TileAction {
    constructor(tile) {
        this.tile = tile;
        this.move_to = tile.pos.clone();
        this.action = Action.None;
    }
    clone() {
        let cloned = new TileAction(this.tile.clone());
        cloned.move_to = this.move_to.clone();
        cloned.action = this.action;
        return cloned;
    }
}
/**
 * Grid
 */
class Grid {
    constructor(size) {
        this.size = size;
        this.cells = new Array(this.size);
        this.cells.forEach((v, i, a) => a[i] = new Array(this.size));
        this.clean_cells();
    }
    clone() {
        let cloned = new Grid(this.size);
        for (let i = 0; i < this.size; i++) {
            for (let j = 0; j < this.size; j++) {
                if (this.cells[i][j]) {
                    cloned.cells[i][j] = this.cells[i][j].clone();
                }
            }
        }
        return cloned;
    }
    clean_cells() {
        for (let i = 0; i < this.size; i++) {
            let row = this.cells[i] = [];
            for (let j = 0; j < this.size; j++) {
                row[j] = null;
            }
        }
    }
    insert_tile(tile) {
        this.cells[tile.pos.x][tile.pos.y] = tile;
    }
    available_cells() {
        let r = new Array();
        for (let i = 0; i < this.size; i++) {
            for (let j = 0; j < this.size; j++) {
                if (this.cells[i][j] === null) {
                    r.push(new Pos(i, j));
                }
            }
        }
        return r;
    }
    cells_available() {
        return !!this.available_cells().length;
    }
    add_random_tile(rand) {
        let acs = this.available_cells();
        if (acs.length === 0) {
            return null;
        }
        let choice = rand() % acs.length;
        let rand_pos = acs[choice];
        let val = (rand() % 10 < 9) ? 2 : 4;
        let new_tile = new Tile(rand_pos, val);
        this.insert_tile(new_tile);
        return new_tile;
    }
    merge_line(tiles, direction) {
        let r = [];
        // step 1. merge tiles.
        let last_merged = false;
        for (let i = 0; i < tiles.length; i++) {
            if (i === 0) {
                r.push(new TileAction(tiles[i].clone()));
            }
            else {
                let prev_tile = tiles[i - 1];
                let tile = tiles[i];
                if (!last_merged && tile.val === prev_tile.val) {
                    // merge two tile.
                    let prev_tile_action = r[r.length - 1];
                    prev_tile_action.action |= Action.Merged;
                    let tile_action = new TileAction(tiles[i].clone());
                    tile_action.action |= Action.MergeOther;
                    r.push(tile_action);
                    last_merged = true;
                }
                else {
                    r.push(new TileAction(tiles[i].clone()));
                    last_merged = false;
                }
            }
        }
        // step 2. calculate new position.
        let cur = 0;
        for (let i = 0; i < tiles.length; i++) {
            let ta = r[i];
            if (direction === Direction.Up) {
                if (ta.action & Action.MergeOther) {
                    ta.action |= Action.Move;
                    ta.move_to = new Pos(cur - 1, ta.tile.pos.y);
                    cur--;
                }
                else if (ta.tile.pos.x != cur) {
                    ta.action |= Action.Move;
                    ta.move_to = new Pos(cur, ta.tile.pos.y);
                }
            }
            else if (direction === Direction.Down) {
                if (ta.action & Action.MergeOther) {
                    ta.action |= Action.Move;
                    ta.move_to = new Pos(this.size - cur, ta.tile.pos.y);
                    cur--;
                }
                else if (ta.tile.pos.x != this.size - cur - 1) {
                    ta.action |= Action.Move;
                    ta.move_to = new Pos(this.size - cur - 1, ta.tile.pos.y);
                }
            }
            else if (direction === Direction.Left) {
                if (ta.action & Action.MergeOther) {
                    ta.action |= Action.Move;
                    ta.move_to = new Pos(ta.tile.pos.x, cur - 1);
                    cur--;
                }
                else if (ta.tile.pos.y != cur) {
                    ta.action |= Action.Move;
                    ta.move_to = new Pos(ta.tile.pos.x, cur);
                }
            }
            else if (direction === Direction.Right) {
                if (ta.action & Action.MergeOther) {
                    ta.action |= Action.Move;
                    ta.move_to = new Pos(ta.tile.pos.x, this.size - cur);
                    cur--;
                }
                else if (ta.tile.pos.y != this.size - cur - 1) {
                    ta.action |= Action.Move;
                    ta.move_to = new Pos(ta.tile.pos.x, this.size - cur - 1);
                }
            }
            cur++;
        }
        return r;
    }
    calculate_actions(direction) {
        let r = [];
        for (let i = 0; i < this.size; i++) {
            // gather cells in line with direction.
            let tiles = [];
            for (let j = 0; j < this.size; j++) {
                let x = 0, y = 0;
                if (direction === Direction.Up) {
                    x = j;
                    y = i;
                }
                else if (direction === Direction.Down) {
                    x = this.size - j - 1;
                    y = i;
                }
                else if (direction === Direction.Left) {
                    x = i;
                    y = j;
                }
                else if (direction === Direction.Right) {
                    x = i;
                    y = this.size - j - 1;
                }
                if (this.cells[x][y]) {
                    tiles.push(this.cells[x][y]);
                }
            }
            // call merge_line get TileAction.
            let tas = this.merge_line(tiles, direction);
            if (tas.length > 0) {
                r = r.concat(tas);
            }
        }
        return r;
    }
    apply_actions(tas) {
        this.clean_cells();
        for (let ta of tas) {
            let val = ((ta.action & Action.Merged) > 0) ? ta.tile.val * 2 : ta.tile.val;
            let new_pos = ((ta.action & Action.Move) > 0) ? ta.move_to.clone() : ta.tile.pos.clone();
            if (!(ta.action & Action.MergeOther)) {
                this.cells[new_pos.x][new_pos.y] = new Tile(new_pos, val);
            }
        }
    }
    get_tiles() {
        let r = [];
        for (let i = 0; i < this.size; i++) {
            for (let j = 0; j < this.size; j++) {
                if (this.cells[i][j]) {
                    r.push(this.cells[i][j].clone());
                }
            }
        }
        return r;
    }
    get_cell_vals() {
        let r = [];
        for (let i = 0; i < this.size; i++) {
            r[i] = [];
            for (let j = 0; j < this.size; j++) {
                if (this.cells[i][j] === null) {
                    r[i][j] = 0;
                }
                else {
                    r[i][j] = this.cells[i][j].val;
                }
            }
        }
        return r;
    }
}
var GameEvent;
(function (GameEvent) {
    GameEvent[GameEvent["Animate"] = 0] = "Animate";
    GameEvent[GameEvent["NewTile"] = 1] = "NewTile";
    GameEvent[GameEvent["ScoreChanged"] = 2] = "ScoreChanged";
    GameEvent[GameEvent["End"] = 3] = "End";
})(GameEvent || (GameEvent = {}));
/**
 * Game. contains operation history.
 */
class Game {
    constructor(seed, // random seed.
    size, // grid size.
    start_tiles, // statup tiles count.
    cb // game event callback.
    ) {
        this.grid = new Grid(size);
        this.start_tiles = start_tiles;
        this.moves = [];
        this.score = 0;
        this.max_val = 0;
        this.is_end = false;
        this.cb = cb;
        this.fake_rand = new FakeRand(seed);
        // initialize start tiles.
        for (let i = 0; i < start_tiles; i++) {
            this.add_random_tile();
        }
        this.check();
    }
    add_random_tile() {
        let new_tile = this.grid.add_random_tile(() => this.fake_rand.rand());
        // notify NewTile event.
        if (this.cb)
            this.cb(GameEvent.NewTile, new_tile);
    }
    move_available() {
        if (this.grid.cells_available())
            return true;
        return [Direction.Up, Direction.Down, Direction.Left, Direction.Right].some(d => {
            let tas = this.grid.calculate_actions(d);
            return tas.some(ta => ta.action != Action.None);
        });
    }
    /**
     * Check game has been end?
     */
    check() {
        if (!this.is_end && !this.move_available()) {
            this.is_end = true;
            if (this.cb)
                this.cb(GameEvent.End, null);
        }
    }
    move(direction) {
        let tas = this.grid.calculate_actions(direction);
        let changed = tas.some(ta => ta.action != Action.None);
        if (!changed)
            return false;
        // animate?
        if (this.cb)
            this.cb(GameEvent.Animate, tas);
        // apply action
        this.grid.apply_actions(tas);
        // generate random tile.
        this.add_random_tile();
        // calculate score.
        tas.forEach(ta => {
            if (ta.action & Action.Merged) {
                this.score += ta.tile.val * 2;
                if (this.max_val < ta.tile.val * 2) {
                    this.max_val = ta.tile.val * 2;
                }
            }
        });
        // call callback function
        if (this.cb)
            this.cb(GameEvent.ScoreChanged, this.score);
        // save to action.
        this.moves.push(direction);
        // check game ends
        this.check();
        return true;
    }
    // returns false if moves contains invalid move.
    apply_moves(moves) {
        let r = true;
        for (let m of moves) {
            if (!this.move(m)) {
                r = false;
            }
        }
        return r;
    }
}
/// <reference path="web.ts" />
const direction_key_map = {
    38: Direction.Up,
    39: Direction.Right,
    40: Direction.Down,
    37: Direction.Left,
    75: Direction.Up,
    76: Direction.Right,
    74: Direction.Down,
    72: Direction.Left,
    87: Direction.Up,
    68: Direction.Right,
    83: Direction.Down,
    65: Direction.Left // A
};
class KeyboardController {
    initialize(cb) {
        this.cb = cb;
        $(document).on("keydown", e => this.handle_key_down(e));
    }
    handle_key_down(e) {
        var modifiers = e.altKey || e.ctrlKey || e.metaKey || e.shiftKey;
        var mapped = direction_key_map[e.which];
        if (!modifiers &&
            mapped !== undefined &&
            e.target.tagName.toLowerCase() != "input") {
            e.preventDefault();
            this.cb(InputType.Move, mapped);
        }
    }
}
/// <reference path="game.ts" />
/// <reference path="keyboard.ts" />
var InputType;
(function (InputType) {
    InputType[InputType["NewGame"] = 0] = "NewGame";
    InputType[InputType["Move"] = 1] = "Move";
})(InputType || (InputType = {}));
class UI {
    clear_tiles() {
        $(".tile-container").empty();
    }
    set_score(score) {
        $("#lbl_score").text(score.toString());
    }
    game_end(score) {
        setTimeout(() => {
            bootbox.alert("游戏结束，请上传积分");
        }, 500);
    }
    new_tile(row, column, val) {
        let str = `<div class="tile tile-${val} tile-position-${row + 1}-${column + 1}"><div class="tile-inner tile-new">${val}</div></div>`;
        $(".tile-container").append(str);
    }
    animte(tas) {
        $(".tile-remove").remove();
        for (let ta of tas) {
            let selector = `tile-position-${ta.tile.pos.x + 1}-${ta.tile.pos.y + 1}`;
            let new_selector = `tile-position-${ta.move_to.x + 1}-${ta.move_to.y + 1}`;
            let el = $("." + selector).not(".tile-remove");
            if (ta.action & Action.Move) {
                el.removeClass(selector).addClass(new_selector);
            }
            if (ta.action & Action.Merged) {
                el.addClass("tile-remove");
                // Add new tile.
                let str = `<div class="tile tile-${ta.tile.val * 2} tile-position-${ta.move_to.x + 1}-${ta.move_to.y + 1}"><div class="tile-inner tile-merged">${ta.tile.val * 2}</div></div>`;
                $(".tile-container").append(str);
            }
            if (ta.action & Action.MergeOther) {
                el.addClass("tile-remove");
            }
        }
    }
}
class GameMgr {
    constructor(ui, controllers) {
        this.game = null;
        this.ui = ui;
        this.controllers = controllers;
        this.controllers.forEach(c => c.initialize((type, param) => this.input(type, param)));
    }
    new_game(seed, size, start) {
        this.game = new Game(seed, 4, 2, (t, p) => this.game_ev_handler(t, p));
        this.update_ui();
    }
    register(game_end_cb) {
        this.game_end_cb = game_end_cb;
    }
    /**
     * Input event handler.
     *
     * All actions related game control should use this function.
     */
    input(type, param) {
        if (type === InputType.NewGame) {
            // this.new_game();
        }
        else if (type === InputType.Move) {
            if (this.game && !this.game.is_end) {
                this.game.move(param);
            }
        }
        else {
            throw new Error("Unknown type:" + type);
        }
    }
    /**
     * Game events handler.
     */
    game_ev_handler(type, param) {
        if (type === GameEvent.ScoreChanged) {
            this.ui.set_score(this.game.score);
        }
        else if (type === GameEvent.Animate) {
            let tas = param;
            this.ui.animte(tas);
        }
        else if (type === GameEvent.End) {
            this.ui.game_end(this.game.score);
            if (this.game_end_cb)
                this.game_end_cb();
        }
        else if (type === GameEvent.NewTile) {
            let tile = param;
            this.ui.new_tile(tile.pos.x, tile.pos.y, tile.val);
        }
        else {
            throw new Error("Unknown type:" + type);
        }
    }
    update_ui() {
        this.ui.clear_tiles();
        this.ui.set_score(this.game.score);
        this.game.grid.get_tiles().forEach(tile => {
            this.ui.new_tile(tile.pos.x, tile.pos.y, tile.val);
        });
    }
}
class BtnController {
    initialize(cb) {
        this.cb = cb;
        $("#btn_new_game").on('click', () => this.cb(InputType.NewGame, null));
    }
}
let NebPay = require('nebpay');
let nebPay = new NebPay();
let contract_addr = "n1obnjF2zXCgEwPafNJ1jWqL6f538sUDhBS";
function pop_error(msg) {
    console.error(msg);
    bootbox.dialog({
        backdrop: true,
        onEscape: true,
        message: msg,
        size: "large",
        title: "Error"
    });
}
// play.html
class PlayPage {
    constructor(game_mgr) {
        this.infoes = null;
        this.playing = false;
        this.paying = false;
        this.game_data = null;
        this.game_mgr = null;
        this.game_mgr = game_mgr;
        this.game_mgr.register(() => this.on_game_end());
        this.get_game_infoes();
        $("#btn_pay_start").on("click", e => {
            if (!this.infoes)
                return;
            this.pay_and_start();
        });
        $("#btn_test").on("click", e => {
        });
        $("#btn_query").on("click", e => {
            this.query_paied_game();
        });
        $("#btn_upload").on("click", e => {
            this.upload_score($("#input_msg").val());
        });
    }
    get_game_infoes() {
        nebPay.simulateCall(contract_addr, 0, "get_game_infoes", JSON.stringify([]), {
            qrcode: { showQRCode: false },
            listener: resp => {
                if (!resp.hasOwnProperty("execute_err") || resp.execute_err !== "") {
                    pop_error("get_game_infoes() error:" + JSON.stringify(resp));
                    return;
                }
                this.infoes = JSON.parse(resp.result);
                $("#fee").text(this.infoes.fee / 1000000000000000000);
                console.assert(this.infoes.size === 4);
                console.assert(this.infoes.start === 2);
            }
        });
    }
    pay_and_start() {
        if (this.playing) {
            bootbox.confirm("正在游戏中，确定终止游戏并开始新的一局吗?", b => {
                if (b) {
                    this.playing = false;
                    this.pay_and_start();
                }
            });
            return;
        }
        if (this.paying) {
            console.log("Pay processing...");
            return;
        }
        let sn = nebPay.call(contract_addr, this.infoes.fee / 1000000000000000000, "start_game", "[]", {
            qrcode: { showQRCode: true },
            listener: resp => {
                console.log("Pay resp:" + resp);
            }
        });
        console.log("Serial number:" + sn);
    }
    query_paied_game() {
        if (this.playing) {
            bootbox.confirm("正在游戏中，确定终止吗?", b => {
                if (b) {
                    this.playing = false;
                    this.query_paied_game();
                }
            });
            return;
        }
        nebPay.simulateCall(contract_addr, 0, "query_latest_game", "[]", {
            qrcode: { showQRCode: false },
            listener: resp => {
                if (!resp.hasOwnProperty("execute_err") || resp.execute_err !== "") {
                    pop_error("query_latest_game() error:" + resp);
                    return;
                }
                console.log("Query game result:" + resp);
                let data = JSON.parse(resp.result);
                this.init_game(data);
            }
        });
    }
    start_tick() {
        let update = () => {
            if (!this.game_data.expires) {
                console.error("Invalid");
                this.stop_tick();
                return;
            }
            if (this.game_data.expires < Date.now()) {
                console.log("Tick stop.");
                this.stop_tick();
                return;
            }
            let remains = new Date(this.game_data.expires.getTime() - Date.now());
            let min_str = ((remains.getMinutes() < 10) ? "0" : "") + remains.getMinutes();
            let sec_str = ((remains.getSeconds() < 10) ? "0" : "") + remains.getSeconds();
            $("#time_remain").text(`${min_str}:${sec_str}`);
        };
        this.timer = setInterval(update, 1000);
    }
    stop_tick() {
        clearInterval(this.timer);
    }
    init_game(data) {
        this.stop_tick();
        if (!data) {
            $("#game_id").text("请支付");
            $("#time_remain").text("N/A");
            return;
        }
        $("#game_id").text(data.id);
        this.start_tick();
        this.playing = true;
        this.game_mgr.new_game(data.seed, this.infoes.size, this.infoes.start);
        this.game_data = {
            id: data.id,
            seed: data.seed,
            expires: new Date(data.expires)
        };
    }
    on_game_end() {
        this.playing = false;
    }
    upload_score(msg) {
        let sn = nebPay.call(contract_addr, 0, "upload_score", JSON.stringify([
            this.game_data.id,
            this.game_data.seed,
            msg,
            this.game_mgr.game.score,
            this.game_mgr.game.max_val,
            this.game_mgr.game.moves
        ]), {
            qrcode: { showQRCode: true },
            listener: resp => {
                console.log("Upload score:" + resp);
            }
        });
    }
    _sim_call(func, args, cb) {
        new NebPay().simulateCall(contract_addr, 0, func, JSON.stringify(args), {
            qrcode: { showQRCode: false },
            listener: cb
        });
    }
}
class RankingPage {
    update_score_ranking() {
        nebPay.simulateCall(contract_addr, 0, "get_game_ranking", "[]", {
            qrcode: { showQRCode: false },
            listener: resp => {
                if (!resp.hasOwnProperty("execute_err") || resp.execute_err !== "") {
                    pop_error("update_score_ranking() error." + JSON.stringify(resp));
                    return;
                }
                let array = JSON.parse(resp.result).array;
                $("#score_container").empty();
                if (array.length === 0) {
                    $("#score_container").append("<h4>空</h4>");
                    return;
                }
                let index = 1;
                for (let item of array) {
                    let html = `
            <div class="row my-3">
            <div class="col-1 index text-center"><h4>${index++}</h4></div>
            <div class="col-2 score text-center"><h4>${item.valid_score}</h4></div>
            <div class="col">
              <div class="row font-weight-bold">
                <a href="user.html?${item.addr}">${item.addr}</a>
              </div>
              <div class="row text-secondary">
                ${item.message}
              </div>
            </div>
          </div>
          `;
                    $("#score_container").append(html);
                }
            }
        });
    }
    update_donate_ranking() {
        nebPay.simulateCall(contract_addr, 0, "get_donate_ranking", "[]", {
            qrcode: { showQRCode: false },
            listener: resp => {
                if (!resp.hasOwnProperty("execute_err") || resp.execute_err !== "") {
                    pop_error("update_donate_ranking() error." + JSON.stringify(resp));
                    return;
                }
                let array = JSON.parse(resp.result).array;
                $("#donate_container").empty();
                if (array.length === 0) {
                    $("#donate_container").append("<h4>空</h4>");
                    return;
                }
                let index = 1;
                for (let item of array) {
                    let html = `
            <div class="row my-3">
            <div class="col-1 index text-center"><h4>${index++}</h4></div>
            <div class="col-4 amount text-center"><h4>${new BigNumber(item.amount).div(1000000000000000000).toString()}NAS</h4></div>
            <div class="col">
              <div class="row font-weight-bold">
                <a href="user.html?${item.addr}">${item.addr}</a>
              </div>
              <div class="row text-secondary">
                ${item.message}
              </div>
            </div>
          </div>
          `;
                    $("#donate_container").append(html);
                }
            }
        });
    }
    donate(amount_float, msg) {
        nebPay.call(contract_addr, amount_float, "donate", JSON.stringify([msg]), {
            qrcode: { showQRCode: true },
            listener: null
        });
    }
}
class UserPage {
    get_info(addr) {
        let func_name = "query_user";
        let args = JSON.stringify([addr]);
        if (!addr) {
            func_name = "query_my_info";
            args = JSON.stringify([]);
        }
        nebPay.simulateCall(contract_addr, 0, func_name, args, {
            qrcode: { showQRCode: false },
            listener: resp => {
                if (!resp.hasOwnProperty("execute_err") || resp.execute_err !== "") {
                    pop_error("update_donate_ranking() error." + JSON.stringify(resp));
                    return;
                }
                let user = JSON.parse(resp.result);
                if (!user) {
                    pop_error("从未进行过游戏，没有信息");
                    return;
                }
                $("#addr").text(user.addr);
                $("#uid").text(user.uid);
                $("#donated").text(new BigNumber(user.donated).div(1000000000000000000).toString() + " NAS");
                $("#count").text(user.game_count);
                $("#best_score").text(user.best_score);
                $("#best_val").text(user.best_score_max_val);
                $("#cheating").text(user.cheater ? "是" : "否");
            }
        });
    }
}
