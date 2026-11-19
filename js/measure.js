/**
 * ケイトステージラッシュ蒲田西口店 メンズ眉毛ページ — 計測（Google アナリティクス 4・Microsoft Clarity）
 * 女性向け LP（/Brand/ の js/measure.js）と同じしくみ。同じ GA4 プロパティに送るので、
 * セクション名と置き場所の名前には頭に「メンズ」を付けて、女性向け LP の値と混ざらないようにしている。
 *
 * GA4 に送るイベント（<head> の gtag() を使い、send_to で GA4 だけに送る）
 *   scroll_depth … ページをどこまで下ろしたか。10・25・50・75・90・100% を初めて超えた時に一度ずつ
 *                  （percent_scrolled。GA4 に最初からある「スクロール率」のディメンションで見られる）
 *   section_view … 各セクションが「画面の中央にかかる」か「画面に全部おさまる」状態で 1 秒続いた時に一度ずつ
 *                  （lp_section。目次で飛んだ時に通り過ぎただけのセクションは数えない）
 *   cta_click    … ホットペッパーへのリンクが押された時（cta_type・lp_section＝押された場所・link_text・link_url）
 *                  cta_type は、予約ページなら hotpepper、口コミページ（/review/）なら hotpepper_review
 *   lp_nav       … 目次・フッターなどのページ内リンクが押された時（nav_to＝移動先・lp_section＝押された場所）
 *   faq_open     … よくある質問が開かれた時（faq_question）
 * lp_section・cta_type・nav_to・faq_question は GA4 のカスタム ディメンションに登録済み。
 * lp_section の値の番号はページ上の順番（探索レポートで並べ替えやすくするため）。
 *
 * Clarity には「カスタム タグ」を渡す（録画やヒートマップの絞り込み用）
 *   lp      … このページなら mens
 *   cta     … 押したリンクの種類（hotpepper / hotpepper_review）
 *   traffic … Google 広告のクリックから来た訪問なら google_ads
 *
 * 計測がうまく動かなくても、ページの表示と操作には影響させない（送信はすべて try で包む）。
 */
(function () {
    'use strict';

    var doc = document;

    /* ページ上の順番に並べる */
    var SECTIONS = [
        ['.fv', 'メンズ01 ファーストビュー'],
        ['#check', 'メンズ02 眉のお悩み'],
        ['#why', 'メンズ03 なぜ眉で印象が変わるのか'],
        ['.reasons', 'メンズ04 男性に選ばれる5つの理由'],
        ['.shout', 'メンズ05 第一印象には眉が効く'],
        ['#process', 'メンズ06 施術の流れ（約50分）'],
        ['#menu', 'メンズ07 メニュー・料金'],
        ['#styles', 'メンズ08 仕上がりイメージ'],
        ['#voice', 'メンズ09 お客様の声'],
        ['#access', 'メンズ10 アクセス'],
        ['#flow', 'メンズ11 ご予約の流れ'],
        ['#faq', 'メンズ12 よくある質問'],
        ['#reserve', 'メンズ13 ご予約（ページ最後）'],
        ['.foot', 'メンズ14 フッター']
    ];
    /* セクションの外にある、ボタンやリンクの置き場所 */
    var PLACES = [
        ['#stick', 'メンズ 下部固定ボタン'],
        ['.side--l', 'メンズ PC左パネル'],
        ['.side--r', 'メンズ PC目次'],
        ['.hd', 'メンズ ヘッダー']
    ];
    var GA4_ID = 'G-29VF3FWBLH';
    var TOP_LABEL = 'メンズ00 ページの先頭';
    var SCROLL_MARKS = [10, 25, 50, 75, 90, 100];
    var DWELL_MS = 1000;

    function ctaTypeOf(link) {
        if (link.hostname === 'beauty.hotpepper.jp') {
            return link.pathname.indexOf('/review/') === -1 ? 'hotpepper' : 'hotpepper_review';
        }
        if (link.hostname === 's.lmes.jp' || link.hostname === 'lin.ee') { return 'line'; }
        return null;
    }

    /* GA4 だけに送る。send_to を付けないと、head で config した Google 広告（AW-）にも
       同じイベントが送られ、1回の操作ごとに広告側への通信が増えるため */
    function send(name, params) {
        try {
            if (typeof window.gtag !== 'function') { return; }
            var data = { send_to: GA4_ID };
            Object.keys(params).forEach(function (key) { data[key] = params[key]; });
            window.gtag('event', name, data);
        } catch (err) { /* 計測の失敗はページに影響させない */ }
    }
    function tag(key, value) {
        try {
            if (typeof window.clarity === 'function') { window.clarity('set', key, value); }
        } catch (err) { /* 同上 */ }
    }
    function clip(text) {
        return String(text || '').replace(/\s+/g, ' ').trim().slice(0, 100);
    }

    var sections = [];
    SECTIONS.forEach(function (pair) {
        var el = doc.querySelector(pair[0]);
        if (el) { sections.push({ el: el, label: pair[1], seen: false, center: false, whole: false, timer: null }); }
    });

    function sectionOf(el) {
        for (var i = 0; i < sections.length; i++) {
            if (sections[i].el === el) { return sections[i]; }
        }
        return null;
    }
    /* 要素がどこにあるか：まず固定の置き場所、なければ一番内側のセクション */
    function placeOf(el) {
        for (var i = 0; i < PLACES.length; i++) {
            if (el.closest(PLACES[i][0])) { return PLACES[i][1]; }
        }
        for (var node = el; node && node !== doc.body; node = node.parentElement) {
            var s = sectionOf(node);
            if (s) { return s.label; }
        }
        return 'メンズ その他';
    }

    /* ---------- どこまで下ろしたか ---------- */
    function initScrollDepth() {
        var sent = {};
        var left = SCROLL_MARKS.length;
        var ticking = false;

        function check() {
            ticking = false;
            var root = doc.documentElement;
            var total = Math.max(root.scrollHeight, doc.body ? doc.body.scrollHeight : 0);
            if (!total) { return; }
            var bottom = (window.pageYOffset || root.scrollTop || 0) + window.innerHeight;
            var percent = bottom / total * 100;
            SCROLL_MARKS.forEach(function (mark) {
                if (sent[mark]) { return; }
                if (percent >= mark || (mark === 100 && total - bottom <= 2)) {
                    sent[mark] = true;
                    left -= 1;
                    send('scroll_depth', { percent_scrolled: mark });
                }
            });
            if (left === 0) {
                window.removeEventListener('scroll', onScroll);
                window.removeEventListener('resize', onScroll);
            }
        }
        function onScroll() {
            if (ticking) { return; }
            ticking = true;
            window.requestAnimationFrame(check);
        }
        window.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('resize', onScroll);
        onScroll();
    }

    /* ---------- どのセクションを見たか ---------- */
    function initSectionView() {
        if (!('IntersectionObserver' in window) || !sections.length) { return; }

        function update(s) {
            if (s.seen) { return; }
            if (s.center || s.whole) {
                if (!s.timer) {
                    s.timer = setTimeout(function () {
                        s.timer = null;
                        s.seen = true;
                        centerObserver.unobserve(s.el);
                        wholeObserver.unobserve(s.el);
                        send('section_view', { lp_section: s.label });
                    }, DWELL_MS);
                }
            } else if (s.timer) {
                clearTimeout(s.timer);
                s.timer = null;
            }
        }
        /* 画面の中央（上下 45% を除いた帯）にかかっているか。画面より背の高いセクション向け */
        var centerObserver = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                var s = sectionOf(entry.target);
                if (s) { s.center = entry.isIntersecting; update(s); }
            });
        }, { rootMargin: '-45% 0px -45% 0px', threshold: 0 });
        /* 画面に全部おさまっているか。ページ最後のフッターなど、中央まで来ない短いセクション向け */
        var wholeObserver = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                var s = sectionOf(entry.target);
                if (s) { s.whole = entry.isIntersecting && entry.intersectionRatio >= 0.95; update(s); }
            });
        }, { threshold: [0, 0.95] });

        sections.forEach(function (s) {
            centerObserver.observe(s.el);
            wholeObserver.observe(s.el);
        });
    }

    /* ---------- 押されたもの ---------- */
    function initClicks() {
        doc.addEventListener('click', function (event) {
            var target = event.target;
            if (!target || !target.closest) { return; }

            var link = target.closest('a[href]');
            if (link) {
                var type = ctaTypeOf(link);
                if (type) {
                    send('cta_click', {
                        cta_type: type,
                        lp_section: placeOf(link),
                        link_text: clip(link.innerText || link.textContent),
                        link_url: link.href
                    });
                    tag('cta', type);
                    return;
                }
                var href = link.getAttribute('href') || '';
                if (href.charAt(0) === '#' && href.length > 1) {
                    var dest = href === '#top' ? null : sectionOf(doc.getElementById(href.slice(1)));
                    send('lp_nav', {
                        nav_to: href === '#top' ? TOP_LABEL : (dest ? dest.label : href),
                        lp_section: placeOf(link)
                    });
                }
                return;
            }

            /* main.js がボタン自身で開閉を切り替えた後にここへ届く。開いた時だけ送る */
            var question = target.closest('.qa__q');
            if (question && question.getAttribute('aria-expanded') === 'true') {
                var text = Array.prototype.filter.call(question.querySelectorAll('span'), function (span) {
                    return !span.hasAttribute('aria-hidden');
                }).map(function (span) { return span.textContent; }).join(' ');
                send('faq_open', { faq_question: clip(text) });
            }
        });
    }

    /* ---------- このページの目印と、Google 広告から来た訪問の目印（Clarity） ---------- */
    function initTraffic() {
        tag('lp', 'mens');
        if (/[?&](gclid|gbraid|wbraid)=/.test(window.location.search)) { tag('traffic', 'google_ads'); }
    }

    [initScrollDepth, initSectionView, initClicks, initTraffic].forEach(function (fn) {
        try { fn(); } catch (err) { if (window.console) { console.error('[measure]', err); } }
    });
})();
