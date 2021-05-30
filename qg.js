// ver.1.00 since 2013/11/30
// ver.1.10 since 2021/05/30

const MAX_LEVEL = 5;
const COND_CLEAR = 5;
const INIT_SPARE = 1;
const TIME_LIMIT = 10;

////////////////// タイマ
let t = {
    rtime: 0,
    passageID: null,

    //@ カウンタ開始
    start: (sec) => {
        t.rtime = 5 * sec;
        t.passageID = setInterval(t.showPassage, 1000 / 5);
    },
    //@ カウンタ中止
    stop: () => {
        if (t.passageID) clearInterval(t.passageID);
        t.rtime = 0;
    },
    //@ カウントダウン
    showPassage: () => {
        $("#timer").text(Math.ceil(t.rtime / 5));
        q.state_machine();
        t.rtime--;
    },
};

////////////////// 単語帳
let word = {
    list: [],
    usedch: "",
    mode: "",
};

//@ カード作成
word.pick_cards = (num) => {
    // 同じ旧字は出題しない
    let dupcheck = (s) => s.split("").some(c => word.usedch.indexOf(c) != -1);

    let fullset = qs_list.map(v => {
        let ret = { older:v[0], grade:v[2], ruby:v[1], hint:v[3] };
        return ret;
    });

    word.list = [...Array(num)].map(w => {
        do {
            if (fullset.length == 0) return;
            let n = parseInt(Math.random() * fullset.length);
            w = fullset[n];
            fullset.splice(n, 1);
        } while(dupcheck(w.older));

        w.newer = word.simplify(w.older);
        return w;
    }).sort((a, b) => (a.grade - b.grade));

    word.shuffle();
    word.dump(fullset);
};

//@ 新字化
word.simplify = (str) => {
    const cs = ctable("cjk cjk+");
    return str.split("").map(ch => {
        const p = cs.older.indexOf(ch);
        if (p < 0) return ch;
        word.usedch += ch;
        return cs.newer[p];
    }).join("");
};

//@ CJK互換文字による旧字化(不要)
word.apply_cjkcompat = (str) => {
    if (word.mode == "ko") return str;

    const cs = ctable((word.mode == "ja++") ? "ibm ibm+ jis0213" : "ibm ibm+");
    return str.split("").map(ch => {
        let p = cs.newer.indexOf(ch);
        if (p < 0) return ch;
        word.usedch += ch;
        return cs.older[p];
    }).join("");
};

//@ カードシャッフル
word.shuffle = () => {
    const q_size = COND_CLEAR + INIT_SPARE;
    for (let i = 0; i < MAX_LEVEL; i++){
        for(let j = 0; j < 10; j++) {
            let t1 = parseInt(Math.random() * q_size);
            let t2 = parseInt(Math.random() * (q_size - 1)) + 1;
            t2 = (t1 + t2) % q_size;
            // swap
            let tmp = word.list[i * q_size + t1];
            word.list[i * q_size + t1] = word.list[i * q_size + t2];
            word.list[i * q_size + t2] = tmp;
        }
    }
};

//@ カード一覧(デバッグ用)
word.dump = (fullset) => {
    return;
    let res = ("ibm jis0213 ibm+ font").split(" ").map(key => JSON.stringify(ctable(key))).join(",").split(",").join(",\n");
    res += "\n";
    res += word.list.map(w => "・(" + w.grade + ") " + w.older + " ⇔ " + w.newer + " ("+ w.ruby + ")").join("\n");
    res += "\n";
    res += word.usedch;
    res += "\n";
    let fullwords = qs_list.map(w => w[0]).join(",");
    res += fullwords;
    res += "\n";
    res += ctable("cjk cjk+ font").older.split("").filter(c => fullwords.indexOf(c) == -1).join("");
    res += "("+ctable("cjk").older.length+")";
    $("#debug").text(res).css({"font-family": "traditional,serif,monospace", "font-size":"20px", "white-space":"break-spaces"});
};

////////////////// ゲーム盤
let q = {
    state: 0,
    level: 0,
    count: { r:0, q:0, t:0, miss:0 },
    ansreg: null,
};

const NEXT = {
    HOLD     : 0,
    PROCEED  : 1,
    GAMEOVER : 2,
    LEVELUP  : 3,
    COMPLETE : 4,
};

const BUTTON = {
    START:  '開始(Enter)',
    SUBMIT: '解答(Enter)',
    NEXT:   '次へ(Space)',
    BACK_TO_TOP: 'トップに戾る',
};

//@ 状態遷移
q.state_machine = () =>
{
    const QSTAT = {
        CONFIG_ENV    : 0,
        INIT_GAME     : 1,
        LV_INDICATION : 2,
        START_QUIZ    : 3,
        ANSWER_CHECK  : 4,
        BACK_TO_TITLE : 5,
    };

  switch(q.state){
  case QSTAT.CONFIG_ENV:
      q.config_env();
      // thru
  case QSTAT.INIT_GAME:
      word.pick_cards((COND_CLEAR + INIT_SPARE) * MAX_LEVEL);
      // thru
  case QSTAT.LV_INDICATION:
      q.level++;
      q.count.q = q.count.r = 0;
      $("#presentation, #inputform, #config").hide();
      $("#titlebox").show().addClass("level");
      $("#title h2, #number u").text("LEVEL " + q.level);
      $("#toclear").text(COND_CLEAR);
      t.start(1.5);
      q.state = QSTAT.START_QUIZ;
      return;

  case QSTAT.START_QUIZ:
      if (0 < t.rtime) return;
      q.state = QSTAT.ANSWER_CHECK;
      q.question();
      return;

  case QSTAT.ANSWER_CHECK:
      q.state = ((next) => {
          if (next == NEXT.LEVELUP)  return QSTAT.LV_INDICATION;
          if (next == NEXT.GAMEOVER) return QSTAT.BACK_TO_TITLE;
          if (next == NEXT.COMPLETE) return QSTAT.COMPLETE;
          if (next == NEXT.PROCEED)  return QSTAT.START_QUIZ;
          return QSTAT.ANSWER_CHECK;
      })(q.admission());
      return;

  case QSTAT.COMPLETE:
      $("#titlebox").show().removeClass("level");
      $('#start').show().val(BUTTON.BACK_TO_TOP);
      $("#presentation, #command, #result, #title h2, #ending").hide();
      $("#ending").fadeIn("slow");
      q.state = QSTAT.BACK_TO_TITLE;
      return;

  case QSTAT.BACK_TO_TITLE:
      location.reload();
  }
};

//@ 出題
q.question = () => {
    const w = word.list[(q.level - 1) * (COND_CLEAR + INIT_SPARE) + q.count.q];
    const queue = (hint => {
        if (!hint) return "";
        return "ヒント：訓読み" + (hint === "訓" ? "" : "含む");
    })(w.hint);

    q.ansreg = new RegExp("^" + w.ruby + "$");
    t.stop();

    $("#inputform, #timer, #inp_ans, #command").show();
    $("#ans, #titlebox, #start, #result span").hide();
    $("#command").text(queue);
    $("#start").val(BUTTON.SUBMIT);
    $("#timer").text(TIME_LIMIT);
    $("#clear").text(q.count.r);
    $("#quiz").text(w.older);
    $("#a").text(w.newer);
    $("#ruby").text(w.ruby);
    $("#inp_ans").focus().val("");
    $("#presentation").slideDown("slow", () => { t.start(TIME_LIMIT); });
};

//@ 合否判定
q.admission = () =>
{
    let is_correct = $("#inp_ans").val()
        .replace(/[^ぁ-ン]/g, "")
        .replace(/[ァ-ン]/g, s => String.fromCharCode(s.charCodeAt(0) - 0x60))
        .match(q.ansreg);
    if (t.rtime && !is_correct) return NEXT.HOLD;
    t.stop();
    return q.show_answer(is_correct);
};

//@ 解答表示
q.show_answer = (is_correct) => {
    q.count.q++;
    if (is_correct) {
        q.count.r++;
        q.count.t += t.rtime + 1;
    } else {
        q.count.miss++;
    }
    
    let next = NEXT.PROCEED;
    if (q.count.miss > INIT_SPARE){
        next = NEXT.GAMEOVER;
    } else if (q.count.r == COND_CLEAR && is_correct) {
        next = (q.level == MAX_LEVEL) ? NEXT.COMPLETE : NEXT.LEVELUP;
    }
    
    $("#desc, #ans").show();
    $("#result span").eq(is_correct ? 0 : 1).show();
    $("#inp_ans, #timer, #command").hide().blur();
    $("#clear").text(q.count.r);
    $("#survive").text("☆".repeat(INIT_SPARE - q.count.miss + 1));
    $('#start').show().focus().val(BUTTON.NEXT);

    if (next != NEXT.PROCEED) {
        $("#result span").eq(next == NEXT.GAMEOVER ? 3 : 2).show();
        if (next == NEXT.GAMEOVER) $('#start').val(BUTTON.BACK_TO_TOP);
    }
    return next;
};

//@ フォント環境の確認(不要)
q.config_env = () => {
    return;
    const option = [["赤枠(左)のみ",   "ko", "#f00"],
                    ["青枠(右)のみ", "ja++", "#00f"],
                    ["両方とも",       "ko", "#808"],
                    ["どちらでもない", "ja", "#000"]];

    let $opts = option.map(opt => {
        let $option = $("<div>").css({color:opt[2], display:"inline-block", height:"24pt", minWidth:"45%", whiteSpace:"nowrap"});
        let $label = $("<label>");
        let $radio = $('<input type="radio" name="config">').val(opt[1]);
        $label.append($radio);
        $label.append(opt[0]);
        $option.append($label);
        return $option;
    });

    let res = "<h2>動作環境チェック</h2>";
    res += '「ネ土」「示土」のいずれかが以下の枠内に表示されます。';
    res += '<div id="sample" style="width:100%; text-align:center; margin:3px; line-height:30pt;">';
    res += ' <div lang="ko" style="border:2px solid red;">社</div>';
    res += ' <div lang="ja" style="border:2px solid blue;">社</div>';
    res += '</div>';

    $("#title > h2").text("");
    $("#config").html(res).css({"text-align":"left", "font-size":"12pt"});
    $("#command").text('「示土」が表示されているのは：');
    $opts.forEach($opt => $("#command").append($opt));
    $("#sample div").addClass("kanji").css({display: "inline-block", width:"30pt", padding:"2px", margin:"4px", height:"30pt"});
    $(":radio[name=config]").eq(2).focus().prop("checked", true);
    $(":radio[name=config]").keydown(function(e){ if(e.keyCode==13) q.state_machine(); });
    $('#start').val(BUTTON.START);
};


/////////////// イベントハンドラ
$(function() {
    $("#qlen").text(MAX_LEVEL * COND_CLEAR);
    $("#start").focus().click(function(){ q.state_machine(); });
    $("#presentation, #inp_ans").hide();
});
