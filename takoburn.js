//var dire_button = ["Positive", "Negative"];
const $id = (id) => document.getElementById(id);
const $name = (name) => [... document.getElementsByName(name)];
const $c = (c, $dom) => [... ($dom ? $dom : document).getElementsByClassName(c)];
const $q = (query, $dom) => [... ($dom ? $dom : document).querySelectorAll(query)];

const method_button = ["[One-by-one] / Simulation", "One-by-one / [Simulation]"];
const matE32 = [... Array(32)].map((v,i) => (1 << i));
let matrix = {
    size: 5,
    game: "",
    A: [],
    B: [],
};

////////////////////////////////////////////////
const tako_rule = (row, size, game) => {
    const x = row % size;
    const y = parseInt(row / size);
    const turnover = (game == "plus") ? {
        dir: [[-1,0], [1,0], [0,-1], [0,1]],
        step: 1,
    } : {
        dir: [[-1,-1], [1,1], [1,-1], [-1,1]],
        step: (size - 1),
    };
  
    let longint = [];
    longint[parseInt(row / 32)] |= matE32[row % 32];
    turnover.dir.forEach(dx => {
        for (let n = 0; n < turnover.step; n++){
            let y1 = y + dx[0] * (n + 1);
            let x1 = x + dx[1] * (n + 1);
            if (x1 < 0 || x1 >= size) continue;
            if (y1 < 0 || y1 >= size) continue;
            let row1 = y1 * size + x1;
            longint[parseInt(row1 / 32)] |= matE32[row1 % 32];
        }
    });
    return longint;
}

////////////////////////////////////////////////
const dump_debug = () => {
    let matsize = matrix.size * matrix.size;
    let res = [...Array(matsize)].map(
        (v,i) => (i + 1) + " "
            + [...Array(matsize)].map(
                (v,j) => (matrix.A[i][parseInt(j / 32)] & matE32[j % 32]) ? "1": "0")
            .join("") + "  "
            + [...Array(matsize)].map(
                (v,j) => (matrix.B[i][parseInt(j / 32)] & matE32[j % 32]) ? "1": "0")
            .join("")
    ).join("\n");
    console.log(res);
};

////////////////////////////////////////////////
matrix.calc = () => {
    const size = matrix.size;
    const matsize = size * size;
    const block = parseInt((matsize - 1) / 32) + 1;
  
    // Apply takoyaki rule to A, an indentify matrix to B
    for (let i = 0; i < matsize; i++) {
        matrix.A[i] = tako_rule(i, size, matrix.game);
        matrix.B[i] = [...Array(block)].map((v,j) => (j == parseInt(i / 32)) ? matE32[i % 32] : 0);
    }

    // Solve the equation: [A][x] = [E]
    for (let i = 0; i < matsize; i++) {
        const div = parseInt(i / 32);
        const bit = matE32[i % 32];
        
        // swap 2 lines
        if(!(matrix.A[i][div] & bit)) {
            let i0 = matrix.A.findIndex(Arow => Arow[div] & bit);
            if (i0 < 0) continue;
            [matrix.A[i0], matrix.A[i]] = [matrix.A[i], matrix.A[i0]];
            [matrix.B[i0], matrix.B[i]] = [matrix.B[i], matrix.B[i0]];
            /*
            for (let j = 0; j < block; j++) {
                [matrix.A[i0][j], matrix.A[i][j]] = [matrix.A[i][j], matrix.A[i0][j]];
                [matrix.B[i0][j], matrix.B[i][j]] = [matrix.B[i][j], matrix.B[i0][j]];
            }
            */
        }
        // xor (Gaussian elimination)
        for (let i0 = 0; i0 < matsize; i0++) {
            if (i0 == i) continue;
            if (matrix.A[i0][div] & bit) {
                for (let j = 0; j < block; j++) {
                    matrix.A[i0][j] ^= matrix.A[i][j];
                    matrix.B[i0][j] ^= matrix.B[i][j];
                }
            }
        }
    }
};

////////////////////////////////////////////////
matrix.solve = (state) => {
    const size = matrix.size;
    const matsize = size * size;
    let ret = [];
    
    for (let i = 0; i < matsize; i++) {
        const is_depend = (matrix.A[i].findIndex(v => v) < 0);
        const sum = state.filter(
            (light, j) => light && (matrix.B[i][parseInt(j / 32)] & matE32[j % 32])
        ).length;
        if (is_depend && sum % 2) return null;
        if (sum % 2) ret.push(i);
    }
    return ret;
};

////////////////////////////////////////////////
const main = () => {
    const state = $q("#present .piece").map($dom => $dom.classList.contains("selected"));
    const $sol = $q("#solution .piece");
    const result = matrix.solve(state);
    
    if (!result) {
        $sol.map($dom => {
            $dom.classList.add("selected");
            $dom.classList.add("fade");
        });
        $c("lock")[0].innerText = ("(No solution)");
        return;
    }

    $sol.map($dom => {
        $dom.classList.remove("selected");
        $dom.classList.remove("fade");
    });

    result.map(idx => $sol[idx].classList.add("selected"));

    $c("lock")[0].innerHTML = '<label><input type="checkbox" id="pin">Lock</label>';
    $id("pin").onclick = function() {
        if (!this.checked) return main();
        $q("#solution .piece").map($dom => $dom.classList.add("fade"));
    };
};
////////////////////////////////////////////////

const piece_takoyaki = (r, c) => {
    const inverse = (r,c) => {
        if (r < 0 || r >= matrix.size) return;
        if (c < 0 || c >= matrix.size) return;
        $q("#present .piece")[r * matrix.size + c].classList.toggle("selected");
    };

    inverse(r, c);
    if ($c("method")[0].value === method_button[0]) return;
    
    if ($id("boardname").value === "plus") {
        inverse(r+1, c);
        inverse(r, c+1);
        inverse(r-1, c);
        inverse(r, c-1);
        return;
    }
    for (let i = 1; i < matrix.size; i++) {
        inverse(r+i, c+i);
        inverse(r-i, c-i);
        inverse(r+i, c-i);
        inverse(r-i, c+i);
    }
};

const board_size_change = () => {
    const $table = ("<tr>"
                    + ('<td class="piece"></td>'.repeat(matrix.size))
                    + "</tr>").repeat(matrix.size);

    $id("solution").innerHTML = $table;
    $id("present").innerHTML = $table;
    $q("#present .piece").map(($dom, index) => $dom.onclick = () => {
        piece_takoyaki(Math.floor(index / matrix.size), index % matrix.size);
        if ($id("pin") && $id("pin").checked) return;
        main();
    });
};

window.onload = () => {
    $c("method")[0].onclick = function() {
        const $dom = this;
        $dom.value = method_button[($dom.value === method_button[0]) ? 1 : 0];
    };
    $id("boardsize").onchange = function() {
        matrix.size = this.value;
        matrix.calc();
        board_size_change();
    };
    $id("boardname").onchange = function() {
        matrix.game = this.value;
        matrix.calc();
        main();
    };
    $id("boardsize").onchange();
    $id("boardname").onchange();
};
