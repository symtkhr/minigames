$(function() {
    var g_counter = 20 * 1000;
    var g_interval = 50;
    var qmax = 5;
    var g_timer = 0;
    var g_qid = 1;

    var show_quiz = function() {
        var ans = 0;
        for (var i = 0; i < (2 + 6 * Math.random()); i++)
            ans |= 1 << parseInt(8 * Math.random());
        var left = ans;
        $(".qid").text(g_qid);
        $(".hint").hide();
        $(".bit span").text("?");
        $(".bit .miss").hide();
        $(".bit").removeClass("selected").eq(0).addClass("selected");
        $("#dec").text(ans);
        $("#quiz").show().css("background-color", "");

        if (!g_timer)
            g_timer = setInterval(function() {
                   g_counter -= g_interval;
                   timer_event(g_counter);
                }, g_interval);

        $(document).unbind("keydown").keydown(function(e) {
           var c = String.fromCharCode(e.keyCode);
           var n = "01".indexOf(c);
           if (n == -1) return;
           $(".bit.selected span").text(c);
           var idx = $(".bit").index($(".bit.selected"));
           var digit = $(".bit").size() - idx - 1;
           if ((ans >> digit) % 2 != n) {
               if (g_counter <= 0) return;
               $(".bit.selected .miss").show();
               $(document).unbind("keydown");
               setTimeout(function() { show_quiz(); }, 300);
               $("#quiz").css("background-color", "#f88");
               return;
           }
           left -= (1 << digit) * n;
           $(".hint").show().html('(残り:<span style="font-size:20pt">' + left+'</span>)');
           $(".bit").removeClass("selected");
           
           if (idx + 1 < $(".bit").size()) {
               $(".bit").eq(idx + 1).addClass("selected");
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
           setTimeout(function() { show_quiz(); }, 300);
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

    timer_event(g_counter);
    $(".bit").each(function(i) {
        $(this).html('<div class="digit">' + (1<<($(".bit").size() - i-1)) + '</div>'
                     + '<div class="miss">×</div><span>?</span>');
    });
    $("#qmax").text(qmax);
    $(document).unbind("keydown").keydown(function(e) {
        if (e.keyCode != 13) return;
        show_quiz();
        $(".st").text("");
    });
});
