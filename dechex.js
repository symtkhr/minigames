$(function() {
    var g_counter = 20 * 1000;
    var g_interval = 50;
    var qmax = 5;
    var g_timer = 0;
    var g_qid = 1;
    var depth = 0;
    var qlist = [0,0,0,0,0];

    $("#quiz").hide().css("background-color", "");

    var eval_level = function(q) {
        var a1 = parseInt(q / 16);
        var a2 = (q % 16);
        var is_kuriage = (q % 10) < (a2 % 10);
        
        if (a1 <= 5 && a2 <= 9 && !is_kuriage) return 1;
        if ((a1 <= 5 || a1 == 10) && a2 <=10) return 2;
        if (a2 == 0) return (a1 > 10) ? 3 : 2;
        if (a1 <= 5) return 3;
        if (a1 <= 10) return (is_kuriage || a2 > 10) ? 4 : 3;

        return is_kuriage ? 5 : 4;
    };
    
    var make_quiz = function(level) {
        for (var i = 0; i < 100; i++) {
            var q = parseInt(Math.random() * 238 + 17);
            if(level == eval_level(q)) return q;
        }
    };

    var show_quiz = function() {
        var ans = make_quiz(g_qid);
        var ansd = [parseInt(ans / 16), (ans % 16)];
        var life = 3;
        var depth = 3;

        $(".qid").text(g_qid);
        $(".hint").show().html("&hearts; ".repeat(life));
        $(".nibble span").text("?");
        $(".nibble .digit").text("");
        $(".nibble .miss").hide();
        $(".nibble").removeClass("selected").eq(0).addClass("selected");
        $("#dec").text(ans);
        if (g_counter > 0)
            $("#quiz").show().css("background-color", "");
        $("#hint, #line16").hide();
        
        if (!g_timer)
            g_timer = setInterval(function() {
                   g_counter -= g_interval;
                   timer_event(g_counter);
                }, g_interval);
        
        $(document).unbind("keydown").keydown(function(e) {
           var c = String.fromCharCode(e.keyCode);
           var n = "0123456789ABCDEF".indexOf(c);
           if (n == -1) return;
           if (c == $(".nibble.selected span").text()) return;
           $(".nibble.selected span").text(c);
           var idx = $(".nibble").index($(".nibble.selected"));
           $(".nibble.selected .digit").text(n * (idx == 0 ? 16 : 1)).css("font-size", "");
           var digit = $(".nibble").size() - idx - 1;

              if (n != ansd[idx]) {
                  $(".nibble.selected .miss").show();
                  depth--;
                  show_hint(depth, idx, ans);
                  if (g_counter <= 0) return;

                  life--;
                  $(".hint").show().html("&hearts; ".repeat(life));
                  if (life > 0) return;

                  $(document).unbind("keydown");
                  setTimeout(function() { show_quiz(); }, 700);
                  $("#quiz").css("background-color", "#f88");
                  return;
              }
              depth = 3;
            $(".nibble .miss").hide();
            $(".nibble").removeClass("selected");
           
           if (idx == 0) {
               $(".nibble").eq(1).addClass("selected");
               return;
           }
           $(document).unbind("keydown");
           if (g_counter <= 0) return;

           clearInterval(g_timer);
           g_timer = 0;
           g_qid++;
           if (g_qid > qmax) {
               show_ending(g_qid, true);
               return;
           }
           setTimeout(function() { show_quiz(); }, 700);
       });
            

    };

    var show_ending = function(q, is_clear) {
        clearInterval(g_timer);
        if (is_clear) {
            $(".st").html("クリアー!!");
            $("#quiz").css("background-color", "#8f8");
            return;
        }
        
        $(".st").html((q-1) + "問で時間切れ!!");
        $("#quiz").css("background-color", "#f88");

    };
        var timer_event = function(t) {
            $("#elapsedbar").text(Math.ceil(t/1000)).css("width", (t/100)+"px");
            if (t > 0) return;
            clearInterval(g_timer);
            show_ending(g_qid);
        };
        var show_hint = function(depth, idx, q) {
            var a1 = q % 16;
            var a0 = (q - a1) / 16;
            $("#hint").show();
            $(".hint2").text("");
            $("#qdot").show().css("left", (q * 50  / 16 - 2) + "px");

            if (idx == 0) {
                $("#line16").show();

                if (depth < 3) {
                    $("#line16 .line").css("background-color", "");
                }
                if ((depth < 2) && (a1 != 0)) {
                    $("#line16 .line").eq(a0).css("background-color","#f00");
                    $(".hint2").text(q + "は、" + (a0 * 16) + "以上 " +
                                     (a0 * 16+16) +"未満 の数です。");
                }
                if ((depth < 2) && (a1 != 0)) {
                    $(".hint2").text(q + "は、0x" + (a0 * 16).toString(16).toUpperCase() + " 以上 0x" +
                                     (a0 * 16+16).toString(16).toUpperCase() +" 未満 の数です。");
                }

            }

            if (idx == 1) {
                $("#line16").show();
                if (depth < 3) {
                    var txt = (a1 == 0) ? "" : ("(" + q + " - " + (a0 * 16) +")");
                    $(".selected .digit").text(txt).css("font-size", "15px");
                    
                    if (a1 >= 13) {
                        $(".hint2").text(txt + "が面倒であれば、" +
                                         (a0 * 16 + 16).toString(16).toUpperCase() + "から" + (16 - a1) + "小さい値");
                    }
                }

                if (depth < 2) {

                    if (a1 >= 10) {
                        $(".selected .digit").text("(" + a1 + ")").css("font-size", "");
                    }

                }
            }


        };


        for(var i = 0; i < 17; i++) $("#line16").append('<div class="line">');
        
        $("#line16 .line").each(function(i) {
                var txt = '<div class="linedec">' + (i*16).toString(10) + '</div>';
                txt += '<div class="linehex"><span style="font-size:50%;">0x</span>'+(i*16).toString(16).toUpperCase() + '</div>';
                txt += '<div class="dot"></div>';
                if(i == 0) txt+='<div id="qdot"></div>';
                $(this).html(txt);
            });
        $("#hint").show();
        
    timer_event(g_counter);
    $(".nibble").each(function(i) {
        $(this).html('<div class="digit">?</div>'
                     + '<div class="miss">×</div><span>?</span>');
    });

    $("#qmax").text(qmax);
    $(document).unbind("keydown").keydown(function(e) {
        if (e.keyCode != 13) return;
        show_quiz();
        $(".st").text("");
    });
        
});
