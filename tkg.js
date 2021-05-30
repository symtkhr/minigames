// ver.1.00 since 2014-02-15
// ver.1.10 since 2021-05-30

const N_OF_Q = 10;
const WAIT_INIT_MSEC = 2000;

/////////////////// 単語帳
let word = {list: []};

//@  カード作成
word.pick_cards = (num) => {
    let fullset = qs_list.map(v => {
        return { abbr: v[0], hint: (v[2] || ""), answer: v[1]};
    });
    word.list = [...Array(num)].map(w => {
        if (fullset.length == 0) return;
        const n = parseInt(Math.random() * fullset.length);
        w = fullset[n];
        fullset.splice(n, 1);
        word.suggested_answer(w);
        return w;
    }).sort((a,b) => (a.assumed.length - b.assumed.length));
    word.dump();
};

//@ 模範解の作成
word.suggested_answer = (qs) => {
    // "(表記ゆれ|表記ゆれ)" の語を前者採用、"(省略可)*" の語を削除
    let str = qs.answer.replace(/\(([^|)]+)\|[^)]+\)/g, (w,a) => a);
    str = str.replace(/\([^)]+\)\*/g, "");

    // 伏字作成
    let is_in_paren = false;
    qs.omit = str.split("").map(c => {
        if (c == "(") { is_in_paren = true; return; }
        if (c == ")") { is_in_paren = false; return; }
        // "(括弧)"内は開示
        return (is_in_paren || c.match(/[^A-Za-z]/)) ? c : "*";
    }).filter(c => c).join("");

    // 模範解
    qs.assumed = str.split("(").join("").split(")").join("");
};

//@  カード一覧(デバッグ用)
word.dump = () => {
    return;
    $("#debug").text(JSON.stringify(word.list).split("},").join("},\n")).css({"white-space":"break-spaces"});
};

////////////////// ゲーム盤
let q = {
    count: {r:0, q:0, t:0, miss:0},
    state: 0,
    is_correct: false,
};

const NEXT = {
  HOLD     : 0,
  PROCEED  : 1,
  GAMEOVER : 2,
  LEVELUP  : 3,
  COMPLETE : 4
};


//@ 状態遷移
q.state_machine = () => {
    const QSTAT = {
        CONFIG_ENV    : 0,
        INIT_GAME     : 1,
        LV_INDICATION : 2,
        START_QUIZ    : 3,
        ANSWER_CHECK  : 4,
        BACK_TO_TITLE : 5,
    };

    switch(q.state) {
    case QSTAT.CONFIG_ENV:
        q.state = QSTAT.INIT_GAME;
        // thru
    case QSTAT.INIT_GAME:
        word.pick_cards(N_OF_Q);
        // thru

    case QSTAT.START_QUIZ:
        q.question();
        q.state = QSTAT.ANSWER_CHECK;
        return;

    case QSTAT.ANSWER_CHECK:
        q.state = (next => {
            if (next == NEXT.COMPLETE) return QSTAT.COMPLETE;
            if (next == NEXT.PROCEED)  return QSTAT.START_QUIZ;
            return QSTAT.ANSWER_CHECK;
        })(q.admission());
        return;
        
    case QSTAT.COMPLETE:
        let res = 'Your Score: <span class="redbold">' + q.count.t + '</span><br /> Thanks for playing!';
        $("#title").hide().html(res).css("font-size","20pt").css("text-align","center").fadeIn("slow");
        $('#start').show().val("トップに戻る");
        $("#presentation, #command").hide();
        $("#titlebox").show().css("height","180px");
        q.state = QSTAT.BACK_TO_TITLE;
        return;

    case QSTAT.BACK_TO_TITLE:
        location.reload();
    }
};

//@ 出題
q.question = () => {
    q.quiz = word.list[q.count.q];
    const qs = q.quiz;

    $("#presentation, #inputform").show();
    $("h2, #start, #titlebox").hide();
    $("#inp_ans").val("").show().focus().keyup(q.admission_user);
    $("#number").text(q.count.q + 1);
    $("#quiz").text(qs.abbr);
    $("#hint").text(qs.hint);
    $("#result span").hide();
    $("#sol, #ans").html('<span class="remain">' + qs.omit + "</span>");

    q.is_correct = false;
    q.ansreg = new RegExp("^" + qs.answer.replace(/[/,-]/g, "[/, -]*") + "$", "i");
    t.start();
};


//@  入力リアルタイム判定
q.admission_user = () => {
    const qs = q.quiz;
    const inp = $("#inp_ans").val();
    let res = inp.split("").map((c,i) => {
        let a = qs.assumed[i] || "";
        if (c.toLowerCase() == a.toLowerCase()) return c;
        if (("/, -".indexOf(c) != -1) && ("/, -".indexOf(a) != -1)) return c;
        return '<span class="wrong">' + c + "</span>";
    }).join("") + '<span class="remain">' + qs.omit.slice(inp.length) + '</span>';
    $("#sol").html(res);

    q.is_correct = inp.match(q.ansreg);
    if (!q.is_correct) return;
    t.stop();
    return q.state_machine();
};

//@  AI入力
q.admission = (inp) => {
    const qs = q.quiz;
    let strlen = parseInt((t.rtime * 200 - WAIT_INIT_MSEC) / q.wait_type_msec);
    strlen = strlen < 0 ? 0 : strlen;
    if (!q.is_correct) {
        $("#ans").html(qs.assumed.slice(0, strlen) + '<span class="remain">' + qs.omit.slice(strlen) + '</span>');
        if (strlen < qs.assumed.length) return NEXT.HOLD;
    }
    t.stop();
    return q.show_answer(strlen);
};

//@  解答表示
q.show_answer = (strlen) => {
    const qs = q.quiz;

    if (q.is_correct) {
        $("#sol").text($("#inp_ans").val());
        q.count.t += parseInt((qs.assumed.length * 2 - strlen) * 3000 / q.wait_type_msec);
    }
    $("#result span").eq(q.is_correct ? 0 : 1).show();
    $('#start').show().val('次へ(Space)');
    $("#point").text(q.count.t);
    $("#inp_ans").unbind().hide().blur();
    $("#start").focus();
    q.count.q++;
    return (q.count.q == N_OF_Q) ? NEXT.COMPLETE : NEXT.PROCEED;
};

////////////////// タイマ
let t = {
    rtime: 0,
    passageID: null,

    //@ カウンタ開始
    start: () => {
        t.stop();
        t.rtime = 0;
        t.passageID = setInterval(t.showPassage, 1000 / 5);
    },
    //@ カウンタ中止
    stop: () => {
        if (t.passageID) clearInterval(t.passageID);
    },
    //@ カウントアップ
    showPassage: () => {
        q.state_machine();
        t.rtime++;
    },
};

/////////////// イベントハンドラ
$(function() {
    $("#start").focus().click(q.state_machine);
    $("#presentation, #inp_ans").hide();
    $("#N_OF_Q").text(N_OF_Q);
    q.wait_type_msec = parseInt($("#level_select").val()) || 600;
});
