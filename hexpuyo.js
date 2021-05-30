const CELL_X = 6;
const CELL_Y = 13;
const COMBINE_BLOCK = 4;
const CellType = function(mark,color){
    this.mark = mark;
    this.color = color;
};
const Type = {
    BLOCK1 : new CellType("x","#4a4"),
    BLOCK2 : new CellType("o","#c5c"),
    BLOCK3 : new CellType("i","orange"),
    BLOCK4 : new CellType("k","#f55"),
    BLOCK5 : new CellType("w","#55e"),
    EMPTY     : new CellType(" "),
    INTERFERE : new CellType("*", "#dbd"),
};

let cells = [...Array(CELL_X)].map(v => [...Array(CELL_Y)].fill(Type.EMPTY));

// 指定した位置x,yを含む4以上の隣接同種ブロックを消去する
const combine = function(x, y, is_only_count)
{
    if (cells[x] == null ||
        cells[x][y] == null ||
        cells[x][y] == Type.EMPTY ||
        cells[x][y] == Type.INTERFERE) return 0;

    // 探索用配列 cells_check[][] = -1(未探索), 1(同一種), 2(それ以外)
    let cells_check = [...Array(CELL_X)].map(v => [...Array(CELL_Y)].fill(-1));
    const blockType = cells[x][y];

    const neighbors = (x, y) => {
        let ret = [
            {x: x + 1, y: y }, //右
            {x: x - 1, y: y }, //左
            {x: x,     y: y + 1}, //下
            {x: x,     y: y - 1}, //上
        ];
        
        if (x % 2 == 0) {
            ret.push({x: x + 1, y: y - 1}); //右上
            ret.push({x: x - 1, y: y - 1}); //左上
        } else {
            ret.push({x: x + 1, y: y + 1}); //右下
            ret.push({x: x - 1, y: y + 1}); //左下
        }
        return ret.filter(v => 0 <= v.x && v.x < CELL_X && 0 <= v.y && v.y < CELL_Y);
    };

    const check = (x, y) => {
        // 探索済み
        if (cells[x] == null || cells[x][y] == null || 0 < cells_check[x][y]) return;

        // 異種
        if (cells[x][y] != blockType) {
            cells_check[x][y] = 2;
            return;
        }

        // 同種
        cells_check[x][y] = 1;

        //再帰チェック
        neighbors(x, y).forEach(p => check(p.x, p.y));
    };


    // 隣接同種ブロックの数を数える
    check(x, y);
    let count = cells_check.map(col => col.filter(v => (v == 1)).length).reduce((sum, v) => sum + v, 0);

    if (is_only_count) return count;
    if (count < COMBINE_BLOCK) return 0;

    const eraser = (x, y) => {
        cells[x][y] = Type.EMPTY;
        $("#cell" + x + "_" + y + " .puyo").addClass("combine");
    };
    
    let eraselist = cells_check
        .map((lane, x) => lane.map((v, y) => (v == 1) ? {x: x, y: y} : null))
        .reduce((list, lane) => { list.push(...lane); return list; }, [])
        .filter(v => v);

    //ブロック消去
    eraselist.forEach(p => {
        eraser(p.x, p.y);
        neighbors(p.x, p.y).filter(p => cells[p.x][p.y] == Type.INTERFERE)
            .forEach(p => eraser(p.x, p.y));
    });

    return count;
};

// 移動可能か判定する
const operable = function(x, y, dx, dy)
{
    const is_empty = (x, y) => (cells[x] && cells[x][y] == Type.EMPTY);
    return (is_empty(x, y) && is_empty(x + dx, y + dy));
}

// 浮いたブロックを落とす
const squash_cells = function()
{
    for (let i = 0; i < cells.length; i++) {
        for (let j = 0; j < cells[i].length; j++) {
            if (cells[i][j] == Type.EMPTY) {
                cells[i].splice(j, 1);
                cells[i].unshift(Type.EMPTY);
            }
        }
    }
};

// 落ちブロックを生成する
const generate_falling = function()
{
    const c = [Type.BLOCK1,
               Type.BLOCK2,
               Type.BLOCK3,
               Type.BLOCK4,
               Type.BLOCK5];
    return {
        obj1: c[Math.floor(Math.random() * c.length)],
        obj2: c[Math.floor(Math.random() * c.length)],
        x: 2, y: 0,
        dx: 0, dy: 1,
    };
}

// 六角マスを描く
const draw_cellbox = function()
{
    cells.map((lane,x) => lane.map((v,y) => {
        let id = 'cell' + (x + "_" + y);
        let $div = $("<div>").prop("id", id).addClass("hexagon").css({top: (y * 46 + (x % 2) * 23 - 23) + 'px', left:(x*40+15)+'px'});
        $("#hexcells").append($div);
    }));
};

// ブロックを描く
const putblock = ($dom, puyo, is_alive) => {
    let $puyo = $("<div>").addClass("puyo").css({backgroundColor: puyo.color}).addClass(is_alive ? "alive" : "");
    if (puyo.mark == "*") $puyo.addClass("interfere");
    $puyo.append("<span class=face>ω</span>");
    $dom.text("").append($puyo);
};

window.onload = function() {
    let rensa = 0;
    let is_deadzone = false;
    let falling = null;
    let fallingpool = generate_falling();
    let passageID = null;
    let interferepool = 0;
    let interset = false;

    const draw = () => {
        cells.map((lane,x) => lane.map((v,y) => {
            let $dom = $('#cell' + x + "_" + y).text("");
            if (v != Type.EMPTY) putblock($dom, v);
        }));
        if (falling) {
            putblock($('#cell' + falling.x + "_" + falling.y), falling.obj1, true);
            putblock($('#cell' + (falling.x + falling.dx) + "_" + (falling.y + falling.dy)), falling.obj2, true);
        }
        if (fallingpool) {
            putblock($("#fp1"), fallingpool.obj1, true);
            putblock($("#fp2"), fallingpool.obj2, true);
        }
        $("#jp0").text("");
        if (interferepool) {
            putblock($("#jp0"), Type.INTERFERE);
            $("#jp0").append(interferepool);
        }
    };

    // 敵連鎖による邪魔ブロック表現
    let tekirensa = () => {
        let t_rensa = 0;

        const run_rensa = () => {
            const zobun = [0,5,9,18,36,54,72,90,108];
            interferepool += zobun[t_rensa] + parseInt(Math.random() * (2 + t_rensa));
            if (7 <= t_rensa || Math.random() * 100 < 66) {
                interset = true;
                return;
            }
            t_rensa++;
            setTimeout(run_rensa, 1000);
        };
        run_rensa();
    };

    // 邪魔ブロック落下
    let fallinterfere = () => {
        if (!interset) return;
        let n = interferepool;
        interset = false;
        interferepool = 0;
        let m = n % cells.length;
        let jamas = [...Array(cells.length)].fill((n - m) / cells.length);
        for (let i = 0; i < m; i++) {
            let x = parseInt(Math.random() * cells.length);
            jamas[x]++;
        }
        jamas.forEach((v,x) => {
            let y = cells[x].lastIndexOf(Type.EMPTY);
            for (let i = 0; (i < v) && (i <= y); i++) {
                cells[x][y - i] = Type.INTERFERE;
            }
        });
    };
    
    document.onkeydown = function(e) {
        $("#command").hide();
        if (!passageID) passageID = setInterval(() => document.onkeydown({keyCode:0x28}), 500);
        if (is_deadzone) return;

        // right
        if (e.keyCode == 0x27 && falling) {
            if (!operable(falling.x + 1, falling.y, falling.dx, falling.dy)) return;
            falling.x++;
            draw();
        }
        // left
        if (e.keyCode == 0x25 && falling) {
            if (!operable(falling.x - 1, falling.y, falling.dx, falling.dy)) return;
            falling.x--;
            draw();
        }
        // space(rotate)
        if (e.keyCode == 0x20 && falling) {
            let dx = 0;
            let dy = 0;
            if (falling.dx == 0) {
                dx = (falling.dy < 0) ? -1 : 1;
            } else {
                dy = (falling.dx < 0) ? 1 : -1;
            }
            if (!operable(falling.x, falling.y, dx, dy)) return;
            falling.dx = dx;
            falling.dy = dy;
            draw();
            return;
        }
        // down or timer event
        if (e.keyCode == 0x28) {
            if (!interset && interferepool == 0 && (Math.random() * 25 < 1)) {
                tekirensa();
            }
            if (falling) {
                // Falling
                if (operable(falling.x, falling.y + 1, falling.dx, falling.dy)) {
                    falling.y++;
                    draw();
                    return;
                }
                // Landing
                cells[falling.x][falling.y] = falling.obj1;
                cells[falling.x + falling.dx][falling.y  + falling.dy] = falling.obj2;
                squash_cells();
                falling = null;
                draw();
                return;
            }

            // Combine
            let n = 0;
            cells.map((lane,x) => lane.map((v,y) => { n += combine(x, y); }));
            squash_cells();

            if (0 < n) {
                rensa++;
                $("#count").text(rensa);
                $(".puyo.combine").eq(0).parent().append("<div class=rensa>" + rensa + "連鎖</div>");
                is_deadzone  = true;
                $(".puyo.combine").fadeOut(() => { is_deadzone = false; draw(); });
                return;
            }
            
            // Nothing combined
            fallinterfere();
            rensa = 0;
            falling = fallingpool;
            fallingpool = generate_falling();
            draw();
            if (cells[2][0] != Type.EMPTY) return gameover();
        }
    };

    draw_cellbox();
    draw();

    let gameover = () => {
        if (passageID) clearInterval(passageID);
        $("#hexcells, #next").animate({opacity: .3}, function() {
            $("#command").show();
            document.onkeydown = function(e) { location.reload(); };
        });
    };
};
