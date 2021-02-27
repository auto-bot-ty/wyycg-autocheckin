/**
 * @module reset
 * @description 进行重写页面以外的处理
 * @author Motoori Kashin
 * @license MIT
 */
(function () {
    const BLOD = window.BLOD; /** @see main  */
    const debug = BLOD.debug; /** @see debug */
    const config = BLOD.config; /** @see main */
    const xhr = BLOD.xhr; /** @see xhr */
    const toast = BLOD.toast; /** @see debug */
    console.debug('import module "reset.js"');

    BLOD.reset = {
        /**
         * 监听window下的对象
         */
        getVariable: () => {
            function read(arr) {
                switch (arr[0]) {
                    case "aid": BLOD.aid = arr[1];
                        break;
                    case "cid": BLOD.cid = arr[1];
                        break;
                    case "__playinfo__": BLOD.__playinfo__ = arr[1];
                        break;
                }
            }
            try {
                Object.defineProperty(window, "aid", { set: (value) => { read(["aid", value]) }, get: () => { return BLOD.aid }, configurable: true });
                Object.defineProperty(window, "cid", { set: (value) => { read(["cid", value]) }, get: () => { return BLOD.cid }, configurable: true });
                Object.defineProperty(window, "__playinfo__", { set: (value) => { read(["__playinfo__", value]) }, get: () => { return BLOD.__playinfo__ }, configurable: true });
                Object.defineProperty(window, "__BILI_CONFIG__", { get: () => { return { "show_bv": false } }, configurable: true });
                if (BLOD.path[2] == "live.bilibili.com" && config.reset.roomplay) Object.defineProperty(window, "__NEPTUNE_IS_MY_WAIFU__", { get: () => { return undefined }, configurable: true });
            } catch (e) { e = Array.isArray(e) ? e : [e]; toast.error("对象监听", ...e); }
        },
        /**
         * 替换原生脚本，不直接修改页面框架
         * @param {string} str 页面框架
         */
        oldScript: (str) => {
            let comment = config.reset.oldreply ? "//cdn.jsdelivr.net/gh/MotooriKashin/Bilibili-Old@c74067196af49a16cb6e520661df7d4d1e7f04e5/src/comment.min.js" : "//cdn.jsdelivr.net/gh/MotooriKashin/Bilibili-Old/src/comment.min.js";
            str = str.replace("//static.hdslb.com/js/video.min.js", "//cdn.jsdelivr.net/gh/MotooriKashin/Bilibili-Old/src/video.min.js");
            // CDN未更新前，两种conment.js都匹配一次
            str = str.replace("//static.hdslb.com/phoenix/dist/js/comment.min.js", comment);
            str = str.replace("//s1.hdslb.com/bfs/seed/jinkela/commentpc/comment.min.js", comment);
            str = str.replace("//s1.hdslb.com/bfs/static/jinkela/rank/rank.ba58f8684a87651e0e1c576df8f918bfa10c1a90.js", "//cdn.jsdelivr.net/gh/MotooriKashin/Bilibili-Old/src/rank.ba58f8684a87651e0e1c576df8f918bfa10c1a90.js");
            return str;
        },
        /**
         * 移除付费预览框
         * @param {HTMLElement} node 预览框节点
         */
        removePreview: async (node) => {
            try {
                if (!config.reset.preview) return;
                let hint = document.getElementsByClassName("video-float-hint-text")[0];
                // 倒计时长度，单位：秒
                let i = 10;
                let sec = document.createElement("span");
                sec.setAttribute("class", "video-float-hint-btn second-cut");
                hint.parentNode.appendChild(sec);
                function cut() {
                    sec.innerText = i - 1 + "s";
                    if (i == 0) {
                        node.remove();
                        toast("移除付费预览提示框");
                        return;
                    }
                    i = i - 1;
                    window.setTimeout(cut, 1000);
                }
                new cut();
            }
            catch (e) { e = Array.isArray(e) ? e : [e]; toast.error("付费预览", ...e); }
        },
        /**
         * 替换顶栏底栏
         */
        resetSction: async () => {
            if (!config.reset.grobalboard) return;
            if (BLOD.path.name) return;
            if (BLOD.head && BLOD.foot) return;
            let emap = [
                { type: "text/javascript", src: "//static.hdslb.com/js/jquery.min.js" },
                { class: "z-top-container has-menu" },
                { type: "text/javascript", src: "//s1.hdslb.com/bfs/seed/jinkela/header/header.js" },
                { class: "footer bili-footer report-wrap-module", id: "home_footer" },
                { type: "text/javascript", src: "//static.hdslb.com/common/js/footer.js" }
            ]
            let newHead = document.querySelector("#internationalHeader");
            let newFoot = document.querySelector(".international-footer");
            if (!BLOD.head && newHead) {
                BLOD.head = true;
                if (!window.$) BLOD.addElement("script", emap[0], undefined, true);
                newHead.setAttribute("style", "visibility:hidden;");
                if (document.querySelector(".mini-type") && !location.href.includes("blackboard/topic_list") && !location.href.includes("blackboard/x/act_list")) {
                    emap[1].class = "z-top-container";
                }
                if (BLOD.path.mhead) emap[1].class = "z-top-container";
                BLOD.addElement("div", emap[1], undefined, true);
                BLOD.addElement("script", emap[2], undefined, true);
            }
            if (!BLOD.foot && newFoot) {
                BLOD.foot = true;
                BLOD.addElement("div", emap[3], undefined, false, newFoot);
                BLOD.addElement("script", emap[4])
            }
        },
        /**
         * 切p监听
         */
        switchVideo: async () => {
            if (BLOD.avPlus) debug.msg("视频已失效", "缓存信息仅供参考", 300000);
            if (config.reset.novideo) debug.msg("临时拦截视频载入", "下载完成后务必在设置中关闭！", 300000);
            if (config.reset.download) { BLOD.xml = ""; BLOD.mdf = ""; BLOD.hash = []; };
            if (config.reset.selectdanmu && document.getElementsByClassName("bilibili-player-filter-btn")[1]) document.getElementsByClassName("bilibili-player-filter-btn")[1].click();
            if (config.reset.midcrc && !config.reset.danmuku && !BLOD.hash[0]) xhr.true(BLOD.objUrl("https://api.bilibili.com/x/v1/dm/list.so", { oid: BLOD.cid }));
            setTimeout(() => {
                if (config.reset.viewbofqi) BLOD.bofqiToView();
                if (config.reset.widescreen && document.querySelector(".bilibili-player-iconfont.bilibili-player-iconfont-widescreen.icon-24wideoff")) {
                    document.querySelector(".bilibili-player-video-btn.bilibili-player-video-btn-widescreen").click();
                }
                if (config.reset.danmakuoff && !document.querySelector(".bilibili-player-video-btn.bilibili-player-video-btn-danmaku.video-state-danmaku-off")) {
                    if (document.querySelector(".bilibili-player-video-btn.bilibili-player-video-btn-danmaku")) {
                        document.querySelector(".bilibili-player-video-btn.bilibili-player-video-btn-danmaku").click();
                    }
                }
            });
            if (config.reset.autoplay) setTimeout(() => { window.player && window.player.play && window.player.play() }, 1000)
        },
        /**
         * 修复主页分区
         * @param {HTMLElement} node 分区节点
         * @param {HTMLElement} [move] 添加的节点，相当于变量声明
         */
        fixnews: async (node, move) => {
            try {
                let rank = config.reset.grobalboard ? document.getElementsByClassName("rank-tab")[0] : "";
                if (node.id == "bili_ad") {
                    let sight = node.getElementsByTagName("a");
                    node = node.getElementsByClassName("name");
                    if (node[0]) node[0].text = "资讯";
                    for (let i = 0; i < sight.length; i++) if (sight[i].href.includes("www.bilibili.com/v/ad/ad/")) sight[i].href = "https://www.bilibili.com/v/information/";
                    let rcon = document.createElement("div");
                    rcon.setAttribute("class", "r-con");
                    rcon.innerHTML = '<div class="r-con"><header style="margin-bottom: 14px"><h3 style="font-size: 18px;font-weight: 400;">资讯分区正式上线啦！</h3></header><div class="carousel-module"><div class="panel"><a href="https://www.bilibili.com/v/information" target="_blank"><img src="//i0.hdslb.com/bfs/archive/0747d26dbbc3bbf087d47cff49e598a326b0030c.jpg@320w_330h_1c.webp" width="260" height="280"/></a></div></div></div>';
                    document.getElementById("ranking_ad").replaceWith(rcon);
                }
                if (node.className == "report-wrap-module elevator-module") for (let item of node.children[1].children) if (item.innerHTML == "广告") item.innerHTML = "资讯";
                if (node.id == "bili-header-m") {
                    node = node.getElementsByClassName('nav-name');
                    if (node[0]) {
                        for (let i = 0; i < node.length; i++) {
                            if (node[i].textContent == "科技") {
                                move = node[i].parentNode.parentNode.children[1].lastChild.cloneNode(true);
                                move.firstChild.href = move.firstChild.href.replace("technology", "life");
                                node[i].parentNode.parentNode.children[1].lastChild.remove();
                            }
                            if (node[i].textContent == "广告") {
                                node[i].textContent = "资讯";
                                node[i].parentNode.href = "//www.bilibili.com/v/information/";
                            }
                            if (node[i].textContent == "生活") {
                                let sight = node[i].parentNode.parentNode.children[1];
                                sight.insertBefore(move, sight.lastChild)
                            }
                            if (node[i].textContent == "娱乐") node[i].parentNode.parentNode.children[1].lastChild.remove();
                        }
                    }
                }
                if (rank && rank.children[5]) {
                    rank.children[5].innerText == "知识" ? rank.children[5].innerText = "科技" : "";
                    rank.children[6].innerText == "知识" ? rank.children[6].innerText = "科技" : "";
                }
            }
            catch (e) { e = Array.isArray(e) ? e : [e]; toast.error("主页分区", ...e); }
        },
        /**
         * 修复评论跳转链接
         * @param {HTMLElement} node 评论节点
         */
        fixVideoSeek: (node) => {
            if (document.querySelector("#bofqi")) {
                node.querySelectorAll("a.video-seek").forEach(function (v) {
                    v.addEventListener("click", function (e) {
                        BLOD.bofqiToView();
                        window.player.seek(Number(e.target.attributes[2].nodeValue));
                    })
                })
            }
            if (config.reset.commentjump) BLOD.reset.renameCommentJump();
        },
        /**
         * 还原评论跳转链接为av号
         */
        renameCommentJump: () => {
            document.querySelectorAll(".comment-jump-url").forEach((d, i, e) => {
                if (d.href && !d.href.includes(d.innerText)) {
                    d = d.href.split("/");
                    d = d[d.length - 1] || d[d.length - 2];
                    if (config.reset.bvid2av && d.toLowerCase().startsWith('bv')) d = BLOD.abv(d);
                    e[i].title = e[i].innerHTML;
                    e[i].innerHTML = d;
                }
            })
        },
        /**
         * 修复主页排行：电视剧、电影、纪录片
         * @param {HTMLElement} node 分区节点
         */
        fixrank: async (node) => {
            // 这些分区排行榜已全部采用类似番剧排行的模式，故采用相似的节点覆盖
            let sort = {
                bili_movie: ["ranking_movie", 2, "https://www.bilibili.com/ranking/cinema/23/0/3"],
                bili_teleplay: ["ranking_teleplay", 5, "https://www.bilibili.com/ranking/cinema/11/0/3"],
                bili_documentary: ["ranking_documentary", 3, "https://www.bilibili.com/ranking/cinema/177/0/3"]
            }
            sort = sort[node.id];
            if (!sort) return;
            let section = node.getElementsByClassName("sec-rank report-wrap-module zone-rank")[0];
            section.innerHTML = '<header class="rank-head"><h3>排行</h3></header><div class="rank-list-wrap"><ul class="bangumi-rank-list rank-list"></ul></div><a href="' + sort[2] + '" target="_blank" class="more-link">查看更多<i class="icon icon-arrow-r"></i></a>';
            try {
                let data = await xhr.true(BLOD.objUrl("https://api.bilibili.com/pgc/season/rank/web/list", { season_type: sort[1], day: 3 }));
                data = BLOD.jsonCheck(data).data;
                node = node.getElementsByClassName("bangumi-rank-list rank-list")[0];
                for (let i = 0; i < 8; i++) {
                    let li = document.createElement("li"),
                        cl = i < 3 ? "rank-item highlight" : "rank-item",
                        fw;
                    li.setAttribute("class", cl);
                    li.innerHTML = '<i class="ri-num">' + (i + 1) + '</i><a href="' + data.list[i].url + '" target="_blank" title="' + data.list[i].title + ' 播放:' + data.list[i].stat.view + '" class="ri-info-wrap"><p class="ri-title">' + data.list[i].title + '</p><span class="ri-total">' + data.list[i].new_ep.index_show + '</span></a>';
                    li.onmouseover = () => {
                        fw = document.createElement("div");
                        fw.setAttribute("class", "bangumi-info-module");
                        fw.setAttribute("style", 'left: ' + li.getBoundingClientRect().left + 'px; top: ' + (BLOD.getTotalTop(li) - 150) + 'px;');
                        fw.innerHTML = '<div class="v-preview clearfix"><div class="lazy-img cover"><img alt="' + data.list[i].title + '" src="' + data.list[i].cover + '" /></div><div><p class="title">' + data.list[i].title + '</p><p class="desc">' + data.list[i].new_ep.index_show + '</p></div></div><div class="v-data"><span class="play"><i class="icon"></i>' + BLOD.unitFormat(data.list[i].stat.view) + '</span><span class="danmu"><i class="icon"></i>' + BLOD.unitFormat(data.list[i].stat.danmaku) + '</span><span class="fav"><i class="icon"></i>' + BLOD.unitFormat(data.list[i].stat.follow) + '</span></div>';
                        document.body.appendChild(fw);
                    }
                    li.onmouseout = () => fw.remove();
                    node.appendChild(li);
                }
            }
            catch (e) { e = Array.isArray(e) ? e : [e]; toast.error("分区排行", ...e); }
        },
        /**
         * 反差弹幕发送者信息
         * @param {HTMLElement} node 弹幕节点
         */
        danmkuHashId: async (node) => {
            if (!config.reset.midcrc) return;
            if (!BLOD.midcrc) new Function(BLOD.getResourceText("crc"))();
            let index = 1 * node.getAttribute("dmno");
            node.addEventListener("contextmenu", () => {
                setTimeout(async (data) => {
                    try {
                        let descipline = document.createElement("li");
                        let onwer = document.createElement("li");
                        let mid = BLOD.midcrc(BLOD.hash[index]);
                        node = document.getElementsByClassName("bili-old-hash");
                        if (node[0]) for (let i = 0; i < node.length; i++) node[i].remove();
                        if (document.getElementsByClassName("bilibili-player-icon bilibili-player-icon-arrow-down")[0]) return;
                        if (document.getElementsByClassName("bilibili-player-icon bilibili-player-icon-arrow-up")[0]) return;
                        descipline.setAttribute("class", "context-line context-menu-descipline bili-old-hash");
                        descipline.innerHTML = '<a class="context-menu-a" href="javascript:void(0);"></a>';
                        onwer.setAttribute("class", "context-line context-menu-function bili-old-hash");
                        onwer.innerHTML = '<a class="context-menu-a js-action" title="" href="//space.bilibili.com/' + mid + '">hash: ' + BLOD.hash[index] + " mid: " + mid + '</a>';
                        node = document.getElementsByClassName("bilibili-player-context-menu-container white")[0];
                        if (!node) return;
                        node.firstChild.insertBefore(descipline, node.firstChild.firstChild);
                        onwer = node.firstChild.insertBefore(onwer, node.firstChild.firstChild);
                        data = BLOD.jsonCheck(await xhr.true(BLOD.objUrl("https://api.bilibili.com/x/web-interface/card", { mid: mid })));
                        onwer.innerHTML = '<div style="min-height:0px;z-index:-5;" class="bb-comment"><div style="padding-top:10px;" class="comment-list"><div class="list-item"><div class="reply-box"><div style="padding:0px" class="reply-item reply-wrap"><div style="margin-left: 15px;" data-usercard-mid="' +
                            mid + '" class="reply-face"><img src="' +
                            data.data.card.face + '@52w_52h.webp" alt=""></div><div class="reply-con"><div class="user"><a style="display:initial;padding: 0px;" data-usercard-mid="' +
                            mid + '" href="//space.bilibili.com/' +
                            mid + '" target="_blank" class="' +
                            (data.data.card.vip.vipType > 1 ? "name vip-red-name" : "name") + '">' + data.data.card.name + '</a> ' +
                            data.data.card.sex + '<a style="display:initial;padding: 0px;" href="//www.bilibili.com/blackboard/help.html#%E4%BC%9A%E5%91%98%E7%AD%89%E7%BA%A7%E7%9B%B8%E5%85%B3" target="_blank"><i class="level l' +
                            data.data.card.level_info.current_level + '"></i></a></div></div></div></div></div></div></div>';
                    }
                    catch (e) {
                        e = Array.isArray(e) ? e : [e];
                        toast.error("弹幕反查", "crc：" + BLOD.hash[index] + " mid：" + BLOD.midcrc(BLOD.hash[index]), e[0] + " " + e[1], ...e);
                    }
                })
            })
        },
        /**
         * 移除HTML节点
         */
        resetNodes: async () => {
            BLOD.reset.parameterTrim(true);
            let remove = (node, type, hidden, index, callback) => {
                index ? index : index = 0;
                switch (type) {
                    case "id": node = document.querySelector("#" + node); break;
                    case "class": node = node.replace(/ /g, "."); node = document.querySelectorAll("." + node)[index]; break;
                    case "tag": node = document.querySelectorAll(node)[index]; break;
                }
                if (!node || node.getAttribute("hidden")) return;
                // 一般能移除的就移除，否则隐藏
                debug.debug("移除节点", node);
                hidden ? node.setAttribute("hidden", "hidden") : node.remove();
                callback && callback();
            }
            // 移除天选时刻
            if (config.reset.noanchor) remove("anchor-guest-box-id", "id", null, null, () => toast.warning("拦截天选时刻！"));
            // 移除大乱斗
            if (config.reset.nopkvm) remove("chaos-pk-vm", "id", null, null, () => toast.warning("拦截大乱斗！"));
            // 隐藏联系客服
            remove("contact-help", "class", true);
            // 隐藏历史记录搜索功能
            if (config.reset.searchHistory) remove("b-head-search", "class");
            // 移除新版提示
            remove("new-entry", "class");
            if (BLOD.path.name == "index") remove("ver", "class");
            remove("trynew-btn", "class");
            if (config.reset.panel) remove("bilibili-player-ending-panel", "class");
            // 移除app下载浮动框
            remove("fixed_app_download", "id");
            remove("app-download", "class");
            // 移除登录弹窗
            if (config.reset.grobalboard && BLOD.load) {
                if (document.querySelector(".unlogin-popover")) document.querySelector(".unlogin-popover").parentNode.remove()
                remove("lt-row", "class");
            }
            // 移除直播水印
            remove("bilibili-live-player-video-logo", "class");
            // 移除失效顶栏
            remove("bili-header-m report-wrap-module", "class", false, 1);
            // 移除主页昨日榜
            if (BLOD.path.name == "index") remove("rec-btn prev", "class");
            // 移除主页七日榜
            if (BLOD.path.name == "index") remove("rec-btn next", "class");
            // 移除双重视频下载右键菜单
            if (document.getElementsByClassName("bili-old-download")[1]) document.getElementsByClassName("bili-old-download")[0].remove();
            // 使顶栏透明
            if (config.reset.headblur) {
                let blur = document.getElementsByClassName("blur-bg");
                if (blur[0]) blur[0].removeAttribute("style");
            }
            // 移除新版顶栏
            if (document.querySelector("#bili-header-m") && document.querySelector("#internationalHeader")) document.querySelector("#internationalHeader").remove();
        },
        /**
         * 识别BV号转化为超链接
         */
        avdesc: async () => {
            let desc = document.getElementsByClassName("info");
            if (desc[1] && desc[1].parentNode && desc[1].parentNode.id == "v_desc") {
                if (desc[1].outerHTML.match(/BV[A-Za-z0-9]+/i)) {
                    let paster = desc[1].outerHTML.match(/BV[A-Za-z0-9]+/i);
                    for (let i = 0; i < paster.length; i++) {
                        let newer = "av" + BLOD.abv(paster[i]);
                        newer = '<a target="_blank" href="//www.bilibili.com/video/' + newer + '">' + newer + '</a>';
                        desc[1].innerHTML = desc[1].outerHTML.replace(paster[i], newer);
                    }
                }
            }
        },
        /**
         * 添加点赞功能
         * @param {*} [data] 相当于声明变量
         */
        setLike: async (data) => {
            if (!config.reset.like) return;
            let timer = window.setInterval(async () => {
                let coin = document.getElementsByClassName("bilibili-player-video-subtitle")[0];
                let number = document.getElementsByClassName("number")[0];
                let node = document.getElementsByClassName("coin")[0];
                // 判断页面渲染进度
                if (coin && node) {
                    window.clearInterval(timer);
                    let span = document.createElement("span");
                    let move = document.createElement("i");
                    let moved = document.createElement("b");
                    let text = document.createTextNode("点赞 --");
                    let arg = text;
                    // 创建点赞数据相关节点并初始化
                    span.setAttribute("class", "u like");
                    span.setAttribute("style", "margin-right : 5px;");
                    span.appendChild(move);
                    span.appendChild(moved);
                    span.appendChild(text);
                    move.setAttribute("class", "l-icon-move");
                    move.setAttribute("style", "width : 22px;height : 22px;background-position : -660px -2068px;");
                    moved.setAttribute("class", "l-icon-moved");
                    moved.setAttribute("style", "width : 22px;height : 22px;background-position : -725px -2068px;display : none;");
                    try {
                        move.onclick = async () => {
                            // 没有点赞过绑定点赞点击事件
                            if (!BLOD.uid) return document.getElementsByClassName("c-icon-move")[0].click();
                            // 构造并请求点赞表单
                            let msg = "aid=" + BLOD.aid + "&like=1&csrf=" + BLOD.getCookies().bili_jct;
                            data = await xhr.post("https://api.bilibili.com/x/web-interface/archive/like", msg);
                            data = BLOD.jsonCheck(data).ttl;
                            // 点亮点赞图标并修改显示数据
                            toast.success("点赞成功！");
                            document.getElementsByClassName("l-icon-move")[0].setAttribute("style", "width : 22px;height : 22px;background-position : -660px -2068px;display : none;");
                            document.getElementsByClassName("l-icon-moved")[0].setAttribute("style", "width : 22px;height : 22px;background-position : -725px -2068px;");
                            if (arg.nodeValue.match("万")) return;
                            let number = 1 * arg.nodeValue.match(/[0-9]+/) + 1;
                            text = document.createTextNode(" 点赞 " + number);
                            arg.replaceWith(text);
                            arg = text;
                        }
                        moved.onclick = async () => {
                            // 点赞过绑定取消点赞点击事件
                            // 构造并请求取消点赞表单
                            let msg = "aid=" + BLOD.aid + "&like=2&csrf=" + BLOD.getCookies().bili_jct;
                            data = await xhr.post("https://api.bilibili.com/x/web-interface/archive/like", msg);
                            data = BLOD.jsonCheck(data).ttl;
                            // 熄灭点赞图标并修改显示数据
                            toast.warning("取消点赞！");
                            document.getElementsByClassName("l-icon-move")[0].setAttribute("style", "width : 22px;height : 22px;background-position : -660px -2068px;");
                            document.getElementsByClassName("l-icon-moved")[0].setAttribute("style", "width : 22px;height : 22px;background-position : -725px -2068px;display : none;");
                            if (arg.nodeValue.match("万")) return;
                            let number = 1 * arg.nodeValue.match(/[0-9]+/) - 1;
                            text = document.createTextNode(" 点赞 " + number)
                            arg.replaceWith(text);
                            arg = text;
                        }
                        number.insertBefore(span, node);
                        // 获取点赞数据
                        data = await xhr.true(BLOD.objUrl("https://api.bilibili.com/x/web-interface/view", { "aid": BLOD.aid }));
                        data = BLOD.jsonCheck(data).data.stat.like;
                        document.getElementsByClassName("like")[0].setAttribute("title", "点赞人数" + data);
                        text = document.createTextNode(" 点赞 " + BLOD.unitFormat(data));
                        arg.replaceWith(text);
                        arg = text;
                        if (!BLOD.uid) return;
                        data = BLOD.jsonCheck(await xhr.true(BLOD.objUrl("https://api.bilibili.com/x/web-interface/archive/has/like", { "aid": BLOD.aid }))).data;
                        if (data == 1) {
                            // 点赞过点亮图标
                            move.setAttribute("style", "width : 22px;height : 22px;background-position : -660px -2068px;display : none;");
                            moved.setAttribute("style", "width : 22px;height : 22px;background-position : -725px -2068px;");
                        }
                    }
                    catch (e) { e = Array.isArray(e) ? e : [e]; toast.error("点赞功能", ...e); }
                }
            }, 100);
        },
        /**
         * 获取账号注册时间
         */
        setJoinTime: async () => {
            if (!BLOD.mid && !config.reset.jointime) return;
            let data = await xhr.GM(BLOD.objUrl("https://account.bilibili.com/api/member/getCardByMid", { "mid": BLOD.mid }));
            try {
                data = BLOD.jsonCheck(data);
                // 格式化时间戳，不是13位，主动补位
                let jointime = BLOD.timeFormat(data.card.regtime * 1000, 1);
                if (BLOD.big) toast(data.card.name + " mid：" + BLOD.mid, "注册时间：" + jointime, "生日：" + data.card.birthday);
                debug.log("注册时间", data.card.name, jointime);
                document.addEventListener("DOMNodeInserted", (msg) => {
                    let birthday = document.getElementsByClassName("birthday");
                    if (birthday[0]) {
                        if (document.getElementsByClassName("jointime")[0]) return;
                        else {
                            let div = document.createElement("div");
                            let icon = document.createElement("span");
                            let text = document.createElement("span");
                            let style = document.createElement("style");
                            div.setAttribute("class", "item jointime");
                            birthday[0].parentNode.appendChild(div);
                            icon.setAttribute("class", "icon");
                            div.appendChild(icon);
                            text.setAttribute("class", "text");
                            text.innerText = jointime;
                            div.appendChild(text);
                            style.setAttribute("type", "text/css");
                            document.head.appendChild(style);
                            style.appendChild(document.createTextNode(".user .info .meta .row {height : 88px;white-space : normal;}.user .info .jointime .icon {background-position : -209px -84px;}.user .info .jointime .text {color : #00a1d6;}}"));
                        }
                    }
                });
            }
            catch (e) { e = Array.isArray(e) ? e : [e]; toast.error("注册时间", ...e); }
        },
        /**
         * 授权接触区域限制代理服务器使用B站账号
         */
        accesskey: async () => {
            if (window.self != window.top) return;
            if (!config.reset.accesskey) {//
                if (BLOD.getValue("access_key")) {
                    BLOD.deleteValue("access_key");
                    BLOD.deleteValue("access_date");
                    let page = document.createElement("iframe");
                    page.setAttribute("style", "display: none;");
                    page.setAttribute("src", "https://www.biliplus.com/login?act=logout");
                    document.body.appendChild(page);
                    setTimeout(() => { page.remove() }, 3000);
                    toast.success("已取消会员授权！")
                }
                return;
            }
            if (!BLOD.getValue("access_key") || (Date.now() - BLOD.getValue("access_date") > 2160000)) {
                try {
                    if (!BLOD.uid) return toast.warning("请先登录！");
                    let data = BLOD.jsonCheck(await BLOD.xhr.GM(BLOD.urlSign("https://passport.bilibili.com/login/app/third?api=https%3A%2F%2Fwww.mcbbs.net%2Ftemplate%2Fmcbbs%2Fimage%2Fspecial_photo_bg.png", "", 3)));
                    data = await new Promise((resolve, reject) => {
                        BLOD.xmlhttpRequest({
                            method: "GET",
                            url: data.data.confirm_uri,
                            onload: (xhr) => resolve(xhr.finalUrl),
                            onerror: (xhr) => reject(xhr.statusText || data.data.confirm_uri + " net::ERR_CONNECTION_TIMED_OUT"),
                        });
                    })
                    data = BLOD.urlObj(data);
                    let page = document.createElement("iframe");
                    page.setAttribute("style", "display: none;");
                    page.setAttribute("src", BLOD.objUrl("https://www.biliplus.com/login", data));
                    document.body.appendChild(page);
                    setTimeout(() => { page.remove() }, 3000);
                    BLOD.setValue("access_key", data.access_key);
                    BLOD.setValue("access_date", Date.now());
                    toast.success("授权登录成功！", "有效期30天", "届时可能需要重新授权")
                }
                catch (e) { e = Array.isArray(e) ? e : [e]; toast.error("会员授权", ...e); }
            }
        },
        /**
         * 备份旧版播放器设置
         */
        playerSetting: () => {
            let bilibili_player_settings = localStorage.getItem("bilibili_player_settings");
            if (bilibili_player_settings) {
                bilibili_player_settings = JSON.parse(bilibili_player_settings);
                // 记录防挡字幕状态
                if (bilibili_player_settings.setting_config && bilibili_player_settings.setting_config.preventshade) BLOD.preventshade = 1;
                if (bilibili_player_settings.video_status.autopart !== "") BLOD.setValue("bilibili_player_settings", bilibili_player_settings);
                else if (BLOD.getValue("bilibili_player_settings")) localStorage.setItem("bilibili_player_settings", JSON.stringify(BLOD.getValue("bilibili_player_settings")));
            } else if (BLOD.getValue("bilibili_player_settings")) {
                localStorage.setItem("bilibili_player_settings", JSON.stringify(BLOD.getValue("bilibili_player_settings")));
            }
        }
    }

    // 修复失效视频
    BLOD.reset.fixVideoLost = {
        /**
         * 处理收藏中的失效视频
         * @param {*} msg 节点事件，包含失效视频节点
         * @param {*} [data] 相当于声明变量
         */
        favlist: async (msg, data) => {
            // src判定是否为频道并取消重复处理
            if (!config.reset.lostvideo || BLOD.src) return;
            // 获取av号或者将bv转为av
            let title, cover, aid = msg.target.getAttribute("data-aid");
            if (!(1 * aid)) aid = BLOD.abv(aid);
            if (BLOD.ids.indexOf(aid) != -1) return;
            // 记录已经处理过的视频aid
            BLOD.ids.push(aid);
            try {
                // 尝试读取来自jijidown的数据
                data = await xhr.GM("https://www.jijidown.com/video/av" + aid);
                data.match('window._INIT')[0];
                title = data.match(/\<title\>.+?\-哔哩哔哩唧唧/)[0].replace(/<title>/, "").replace(/-哔哩哔哩唧唧/, "");
                cover = data.match(/\"img\":\ \".+?\",/)[0].match(/http.+?\",/)[0].replace(/",/, "");
                // 判断封面是否有效
                cover.match('hdslb')[0];
            } catch (e) {
                try {
                    // 尝试读取来自biliplus数据
                    data = await xhr.GM("https://www.biliplus.com/video/av" + aid);
                    data.match(/\<title\>.+?\ \-\ AV/)[0];
                    title = data.match(/\<title\>.+?\ \-\ AV/)[0].replace(/<title>/, "").replace(/ - AV/, "");
                    cover = data.match(/\<img style=\"display:none\"\ src=\".+?\"\ alt/)[0].replace(/<img style="display:none" src="/, "").replace(/" alt/, "");
                } catch (e) {
                    // 无有效数据只能把标题改为av号
                    title = "av" + aid;
                }
            }
            debug.log("失效视频", "av" + aid);
            if (cover) msg.target.children[0].children[0].setAttribute("src", cover + "@380w_240h_100Q_1c.webp");
            msg.target.children[0].children[0].setAttribute("alt", title);
            msg.target.children[1].setAttribute("href", "//www.bilibili.com/video/av" + aid);
            msg.target.children[1].setAttribute("title", title);
            msg.target.children[1].setAttribute("style", "text-decoration : line-through;color : #ff0000;");
            msg.target.children[1].text = title;
            msg.target.setAttribute("class", "small-item");
            msg.target.children[0].setAttribute("href", "//www.bilibili.com/video/av" + aid);
            msg.target.children[0].setAttribute("target", "_blank");
            msg.target.children[0].setAttribute("class", "cover cover-normal");
        },
        /**
         * 处理频道中的失效视频
         * @param {string} link 频道列表url
         */
        channel: async (link) => {
            if (!config.reset.lostvideo || BLOD.src == window.src) return;
            window.src = BLOD.src;
            try {
                let data, obj = BLOD.urlObj(link),
                    cid = obj.cid,
                    mid = obj.mid,
                    pn = obj.pn;
                let small_item = document.getElementsByClassName("small-item");
                if (small_item[0]) for (let i = 0; i < small_item.length; i++) if (small_item[i].getElementsByClassName("title")[0].title == "已失效视频") break;
                data = await xhr.true(BLOD.objUrl("https://api.bilibili.com/x/space/channel/video", { "mid": mid, "cid": cid, "pn": pn, "ps": 30, "order": 0 }));
                data = BLOD.jsonCheck(data).data;
                for (let i = 0; i < small_item.length; i++) {
                    let aid = small_item[i].getAttribute("data-aid") * 1;
                    let title = data.list.archives[i].title || "av" + aid;
                    if (small_item[i].children[1].title == "已失效视频") {
                        small_item[i].setAttribute("class", "small-item fakeDanmu-item");
                        if (aid) {
                            // 修复失效视频av号
                            debug.log("失效视频", "av" + aid);
                            small_item[i].children[1].setAttribute("href", "//www.bilibili.com/video/av" + aid);
                            small_item[i].children[0].setAttribute("href", "//www.bilibili.com/video/av" + aid);
                        }
                        else {
                            // 修复失效视频bv号
                            aid = small_item[i].getAttribute("data-aid");
                            debug.log("失效视频", aid);
                            small_item[i].children[1].setAttribute("href", "//www.bilibili.com/video/" + aid);
                            small_item[i].children[0].setAttribute("href", "//www.bilibili.com/video/" + aid);
                        }
                        small_item[i].children[0].setAttribute("target", "_blank");
                        small_item[i].children[0].setAttribute("class", "cover cover-normal");
                        small_item[i].children[0].children[0].setAttribute("alt", title);
                        small_item[i].children[0].children[0].setAttribute("src", data.list.archives[i].pic.replace("http", "https") + "@380w_240h_100Q_1c.webp");
                        small_item[i].children[1].setAttribute("target", "_blank");
                        small_item[i].children[1].setAttribute("title", title);
                        small_item[i].children[1].setAttribute("style", "text-decoration : line-through;color : #ff0000;");
                        small_item[i].children[1].text = title;
                    }
                }
            }
            catch (e) { e = Array.isArray(e) ? e : [e]; toast.error("失效视频", ...e); }
        },
        /**
         * 处理个人空间主页的失效视频并固定所有失效视频防止被页面改回去
         * @param {*} msg 节点事件，包含被改回去的失效视频节点
         */
        home: async (msg) => {
            if (!config.reset.lostvideo) return;
            let channel_item = document.getElementsByClassName("channel-item");
            if (channel_item[0]) {
                let small_item = document.getElementsByClassName("small-item");
                if (small_item[0]) {
                    for (let i = 0; i < small_item.length; i++) {
                        if (small_item[i].getAttribute("class") == "small-item disabled") {
                            small_item[i].setAttribute("class", "small-item fakeDanmu-item");
                            let aid = small_item[i].getAttribute("data-aid") * 1;
                            if (aid) {
                                // 修改失效视频av链接
                                debug.log("失效视频", "av" + aid);
                                small_item[i].children[1].setAttribute("href", "//www.bilibili.com/video/av" + aid);
                                small_item[i].children[0].setAttribute("href", "//www.bilibili.com/video/av" + aid);
                            }
                            else {
                                // 修改失效视频bv链接
                                aid = small_item[i].getAttribute("data-aid");
                                debug.log("失效视频", aid);
                                small_item[i].children[1].setAttribute("href", "//www.bilibili.com/video/" + aid);
                                small_item[i].children[0].setAttribute("href", "//www.bilibili.com/video/" + aid);
                            }
                            small_item[i].children[0].setAttribute("target", "_blank");
                            small_item[i].children[0].setAttribute("class", "cover cover-normal");
                            small_item[i].children[1].setAttribute("target", "_blank");
                            small_item[i].children[1].setAttribute("title", small_item[i].children[0].children[0].alt);
                            small_item[i].children[1].setAttribute("style", "text-decoration : line-through;color : #ff0000;");
                            small_item[i].children[1].text = small_item[i].children[0].children[0].alt;
                        }
                    }
                }
            }
            // 固定失效视频数据防止被页面改回去
            if (msg.relatedNode.text == '已失效视频') msg.relatedNode.text = msg.relatedNode.getAttribute("title");
            if (msg.target.className == "small-item disabled") msg.target.className = "small-item";
        }
    }

    // 番剧分集数据
    BLOD.reset.setBangumi = {
        /**
         * 初始化数据
         * @param {*} data 番剧数据字符串
         */
        init: async (data) => {
            if (!config.reset.episodedata) return;
            // 判断是否有分集数据
            if (data.epList[1] && (data.epList[0].aid != data.epList[1].aid)) {
                BLOD.aid = data.epInfo.aid;
                let timer = window.setInterval(() => {
                    if (document.getElementsByClassName("info-sec-av")[0]) {
                        BLOD.reset.setBangumi.episodeData("first");
                        window.clearInterval(timer);
                    }
                }, 1000);
                // 延时取消操作，10s还未载入完成将不再处理
                window.setTimeout(() => window.clearInterval(timer), 10000);
            }
        },
        /**
         * 处理分集数据
         * @param {*} data 用于切p判断处理过与否
         * @param {*} msg 节点事件，包含当前分p的aid
         */
        episodeData: async (data, msg) => {
            try {
                let views = document.getElementsByClassName("view-count")[0].getElementsByTagName("span")[0];
                let danmakus = document.getElementsByClassName("danmu-count")[0].getElementsByTagName("span")[0];
                if (data == "first") {
                    // 判断是否是首次处理
                    if (views.innerText == "-" && danmakus.innerText == "-") return window.setTimeout(() => { BLOD.reset.setBangumi.episodeData("first") }, 100);
                    // 备份总播放数和弹幕数
                    views.setAttribute("title", "总播放数 " + views.innerText);
                    danmakus.setAttribute("title", "总弹幕数 " + danmakus.innerText);
                    debug.debug("总播放数", views.innerText, " 总弹幕数", danmakus.innerText);
                    data = await xhr.true(BLOD.objUrl("https://api.bilibili.com/x/web-interface/archive/stat", { "aid": BLOD.aid }));
                }
                if (!data) {
                    BLOD.aid = msg.relatedNode.innerText.match(/[0-9]+/)[0];
                    data = await xhr.true(BLOD.objUrl("https://api.bilibili.com/x/web-interface/archive/stat", { "aid": BLOD.aid }));
                }
                data = BLOD.jsonCheck(data).data;
                let view = data.view;
                let danmaku = data.danmaku;
                view = BLOD.unitFormat(view);
                danmaku = BLOD.unitFormat(danmaku);
                views.innerText = view;
                danmakus.innerText = danmaku;
                debug.debug("播放", view + " 弹幕", danmaku);
            }
            catch (e) { e = Array.isArray(e) ? e : [e]; debug.error("分集数据", ...e) }
        }
    }

    // 修复评论楼层
    BLOD.reset.setReplyFloor = {
        /**
         * 初始化评论楼层数据
         * @param {*} data 评论数据json
         */
        init(data) {
            if (!config.reset.replyfloor) return;
            let floor = {}, key = ["top", "hots", "replies", "root"];
            data = data.data;
            if (!data) return;
            if (data.upper && data.upper.top) {
                if (Array.isArray(data.top)) data.top.push(data.upper.top);
                else data.top = data.upper.top;
            }
            key.forEach((d) => {
                if (data[d]) {
                    d = Array.isArray(data[d]) ? data[d] : [data[d]]
                    d.forEach((d) => {
                        floor[d.rpid] = d.floor;
                        if (d.replies) {
                            d.replies.forEach((d) => {
                                floor[d.rpid] = d.floor;
                            })
                        }
                    })
                }
            })
            BLOD.floor = floor;
        },
        /**
         * 处理楼中楼
         */
        fix() {
            if (!config.reset.replyfloor) return;
            let floor = BLOD.floor || {};
            let li = document.querySelectorAll(".reply-item.reply-wrap");
            if (li[0]) {
                li.forEach((d) => {
                    let span = d.querySelector(".floor");
                    let id = d.getAttribute("data-id");
                    if (!span && floor[id]) {
                        span = d.querySelector(".info");
                        span.innerHTML = '<span class="floor-num" style="float: left;color: #aaa;padding-right: 10px;">#' + floor[id] + '</span>' + span.innerHTML;
                    }
                })
            } else {
                li = document.querySelectorAll("li");
                li.forEach((d) => {
                    if (d.id.includes("l_id_")) {
                        let span = d.querySelector(".floor-date");
                        let id = d.id.split('_')[2];
                        if (span.parentNode.children.length === 1 && floor[id]) {
                            span.parentNode.innerHTML = '<span class="floor-num" style="float: left;color: #aaa;padding-right: 10px;">#' + floor[id] + '</span>' + span.outerHTML;
                        }
                    }
                })
            }
        }
    }

    // 构造媒体页
    BLOD.reset.setMediaList = {
        /**
         * 构造媒体页数据
         * @param {*} [data] 判断页面是否已经跳转到av页
         */
        init: async (data) => {
            if (!BLOD.ml) return;
            if (data) {
                try {
                    // 获取首个视频av并跳转
                    toast("尝试前往构造媒体页...", "media_id：" + BLOD.ml);
                    data = await xhr.true(BLOD.objUrl("https://api.bilibili.com/x/v1/medialist/detail", { "media_id": BLOD.ml, "pn": 1, "ps": 1 }));
                    data = BLOD.jsonCheck(data).data;
                    location.replace("https://www.bilibili.com/video/av" + data.medias[0].id);
                }
                catch (e) {
                    // 跳转失败，清理残余
                    e = Array.isArray(e) ? e : [e];
                    BLOD.setValue("medialist", 0);
                    toast.error(...e);
                }
            }
            else {
                try {
                    toast("重构媒体页信息中...")
                    let avs = [], value = [], promises = [];
                    // 获取收藏列表，这里获取只能获取到aid
                    data = await xhr.true(BLOD.objUrl("https://api.bilibili.com/x/v1/medialist/resource/ids4Player", { "media_id": BLOD.ml }));
                    data = BLOD.jsonCheck(data).data;
                    for (let i = 0; i < data.medias.length; i++) {
                        BLOD.ids[i] = data.medias[i].id;
                        avs[i] = "av" + data.medias[i].id;
                    }
                    // 同时获取所有aid对应的数据，使用Promise.all对齐，该api会直接忽略失效视频
                    while (avs.length) {
                        let i = avs.length > 20 ? 20 : avs.length;
                        value = avs.splice(0, i);
                        promises.push(xhr.true(BLOD.objUrl("https://api.bilibili.com/x/article/cards", { "ids": value.join("%2C") })));
                    }
                    value = [];
                    data = await Promise.all(promises);
                    // 格式化数据并排序
                    for (let i = 0; i < data.length; i++) {
                        data[i] = BLOD.jsonCheck(data[i]);
                        for (let key in data[i].data) avs.push(data[i].data[key]);
                    }
                    for (let i = 0; i < BLOD.ids.length; i++) {
                        for (let j = 0; j < avs.length; j++) {
                            if (avs[j].aid == BLOD.ids[i]) {
                                value.push(avs[j]);
                                break;
                            }
                        }

                    }
                    BLOD.ids = value;
                    let timer = window.setInterval(() => {
                        if (window.BilibiliPlayer) {
                            clearInterval(timer);
                            // 将视频列表重构为稍后再看列表
                            for (let i = 0; i < BLOD.ids.length; i++) {
                                BLOD.ids[i].progress = 0;
                                BLOD.ids[i].add_at = BLOD.ids[i].ctime;
                                BLOD.ids[i].pages = [];
                                BLOD.ids[i].pages[0] = {};
                                BLOD.ids[i].pages[0].cid = BLOD.ids[i].cid;
                                BLOD.ids[i].pages[0].dimension = BLOD.ids[i].dimension;
                                BLOD.ids[i].pages[0].duration = BLOD.ids[i].duration;
                                BLOD.ids[i].pages[0].from = "vupload";
                                BLOD.ids[i].pages[0].page = 1;
                                BLOD.ids[i].pages[0].part = BLOD.ids[i].title;
                                BLOD.ids[i].pages[0].vid = "";
                                BLOD.ids[i].pages[0].weblink = "";
                            }
                            let toview = { "code": 0, "message": "0", "ttl": 1, "data": { "count": BLOD.ids.length, "list": BLOD.ids } };
                            // 保存初始aid，以便判断是否切p
                            BLOD.oid = BLOD.ids[0].aid;
                            debug.debug("收藏列表", toview);
                            // 构造初始化参数并重新初始化播放器
                            BLOD.obj = { "aid": BLOD.ids[0].aid, "cid": BLOD.ids[0].cid, "watchlater": encodeURIComponent(JSON.stringify(toview)) }; // 重构初始化播放器参数
                            toast.success("重构成功！", "二次刷新播放器...");
                            window.BilibiliPlayer(BLOD.obj);
                            let bpui = document.getElementsByClassName("bpui-button-text");
                            let t = setInterval(() => {
                                // 更新列表名称
                                if (bpui[1]) {
                                    clearInterval(t);
                                    bpui[1].firstChild.innerText = "收藏列表";
                                }
                            }, 100);
                        }
                    }, 100);
                }
                catch (e) { e = Array.isArray(e) ? e : [e]; toast.error("收藏播放页", ...e); }
            }
        },
        /**
         * 监听媒体页切p
         */
        fixvar: async () => {
            if (!BLOD.aid) BLOD.aid = window.aid ? window.aid : BLOD.aid;
            if (BLOD.oid) {
                if (BLOD.oid != window.aid) {
                    // 收藏播放切p判断
                    BLOD.aid = window.aid ? window.aid : BLOD.aid;
                    BLOD.oid = window.aid;
                    BLOD.reset.setMediaList.restore();
                }
            }
        },
        /**
         * 更新媒体页切p数据
         * @param {*} data 构造好的媒体页数据
         */
        restore: async (data) => {
            toast("更新页面信息...", "部分非关键信息不会去额外获取");
            history.replaceState(null, null, "https://www.bilibili.com/video/av" + BLOD.aid + location.search + location.hash);
            for (let i = 0; i < BLOD.ids.length; i++) if (BLOD.ids[i].aid == BLOD.aid) data = BLOD.ids[i];
            let video_info = document.getElementById("viewbox_report");
            let up_info = document.getElementById("v_upinfo")
            let arc_toolbar_report = document.getElementById("arc_toolbar_report");
            document.title = data.title;
            video_info.innerHTML = '<h1 title="' + data.title + '"><!----><span>' + data.title + '</span></h1>' +
                '<div class="tm-info tminfo"><span class="crumb"><a href="//www.bilibili.com">主页</a> &gt;</span> <span class="crumb"><a href="//www.bilibili.com/v/douga/">动画</a> &gt;</span> <span class="crumb"><a href="//www.bilibili.com/v/douga/mad/">MAD·AMV</a></span><time>' + BLOD.timeFormat(data.pubdate * 1000, true) + '</time><a class="btn-appeal">稿件投诉</a></div>' +
                '<div class="number"><span title="总播放数' + data.stat.view + '" class="v play">' + BLOD.unitFormat(data.stat.view) + '</span><span title="总弹幕数' + data.stat.danmaku + '" class="v dm">' + BLOD.unitFormat(data.stat.danmaku) + '</span><span title="本日日排行数据过期后，再纳入本稿件的历史排行数据进行对比得出" class="v rank">最高全站日排行' + data.stat.like + '名</span><span class="line"></span><span class="u like" style="margin-right : 5px;" title="点赞人数' + data.stat.his_rank + '"><i class="l-icon-move" style="width : 22px;height : 22px;background-position : -660px -2068px;"></i><b class="l-icon-moved" style="width : 22px;height : 22px;background-position : -725px -2068px;display : none;"></b> 点赞 ' + BLOD.unitFormat(data.stat.like) + '</span><span report-id="coinbtn1" title="投硬币枚数' + data.stat.coin + '" class="u coin"><i class="c-icon-move"></i><b class="c-icon-moved" style="background-position: -2340px -60px; display: none;"></b> 硬币 ' + BLOD.unitFormat(data.stat.coin) + '</span> <span report-id="collect1" title="收藏人数' + data.stat.favorite + '" class="u fav"><i class="f-icon-move" style="background-position: 0px 0px;"></i><b class="f-icon-moved" style="background-position: -1740px -60px; display: none;"></b> 收藏 ' + BLOD.unitFormat(data.stat.favorite) + '</span></div>';
            up_info.innerHTML = '<div class="u-face fl"><!----><a href="//space.bilibili.com/' + data.owner.mid + '" target="_blank" report-id="head" class="a"><img src="' + data.owner.face + '@68w_68h.webp" width="68" height="68" class="up-face" /><!----><!----><i title="企业/团体认证" class="auth o-auth"></i></a></div>' +
                '<div class="info"><div class="user clearfix"><a href="//space.bilibili.com/' + data.owner.mid + '" target="_blank" report-id="name" class="name is-vip">' + data.owner.name + '</a><a href="//message.bilibili.com/#whisper/mid' + data.owner.mid + '" target="_blank" report-id="message" class="message icon">发消息</a></div><div class="sign static"><span>up主简介</span><!----></div><div class="number clearfix"><span title="投稿数--">投稿：--</span><span title="粉丝数--">粉丝：--</span></div><div class="btn followe"><a report-id="follow1" class="bi-btn b-gz"><span class="gz">+ 关注</span><span class="ygz">已关注</span><span class="qxgz">取消关注</span></a><a report-id="charge" class="bi-btn b-cd elecrank-btn"><span class="cd">充电</span><span class="wtcd">为TA充电</span></a></div></div>';
            arc_toolbar_report.children[0].children[0].title = "分享人数" + data.stat.share;
            arc_toolbar_report.children[0].children[0].innerHTML = '<span class="t">分享</span><span class="num">' + BLOD.unitFormat(data.stat.share) + '</span><i class="icon"></i>';
            arc_toolbar_report.children[2].title = "收藏人数" + data.stat.favorite;
            arc_toolbar_report.children[2].innerHTML = '<div class="btn-item"><i class="icon-move f-icon-moved" style="display: none;"></i><b class="icon-move f-icon-move"></b><span class="t">收藏</span><span class="num">' + BLOD.unitFormat(data.stat.favorite) + '</span></div>';
            arc_toolbar_report.children[3].title = "投硬币枚数" + data.stat.coin;
            arc_toolbar_report.children[3].innerHTML = '<div class="btn-item"><i class="icon-move c-icon-moved" style="display: none;"></i><b class="icon-move c-icon-move"></b><span class="t">硬币</span><span class="num">' + BLOD.unitFormat(data.stat.coin) + '</span></div>';
            document.getElementById("v_tag").children[0].setAttribute("hidden", "hidden");
            document.getElementById("v_desc").children[1].innerText = data.desc;
            new window.bbComment(".comment", window.aid, 1, window.UserStatus.userInfo, "");
            data.stat.like ? video_info.children[2].children[2].setAttribute("style", "display: inline-block;") : video_info.children[2].children[2].setAttribute("style", "display: none;");
            let bpui = document.getElementsByClassName("bpui-button-text");
            let t = setInterval(() => {
                // 更新列表名称
                if (bpui[1]) {
                    clearInterval(t);
                    bpui[1].firstChild.innerText = "收藏列表";
                }
            }, 100);
        },
    }
    // 修复分区对照
    BLOD.reset.fixSort = {
        /**
         * 处理av页
         */
        video: async () => {
            let sort = JSON.parse(BLOD.getResourceText("sort"));
            let timer = window.setInterval(() => {
                let tminfo = document.getElementsByClassName("tm-info");
                if (tminfo[0]) {
                    window.clearInterval(timer);
                    if (!(BLOD.tid in sort)) return;
                    let nodes = tminfo[0].childNodes;
                    // 创建分区信息节点并写入tid对应的分区数据
                    nodes[1].replaceWith(nodes[0].cloneNode(true));
                    nodes[2].replaceWith(nodes[0].cloneNode(true));
                    nodes[2].childNodes[1].remove();
                    nodes[1].childNodes[0].href = sort[sort[BLOD.tid][0]][2];
                    nodes[1].childNodes[0].innerText = sort[sort[BLOD.tid][0]][1];
                    nodes[2].childNodes[0].href = sort[BLOD.tid][2];
                    nodes[2].childNodes[0].innerText = sort[BLOD.tid][1];
                }
            }, 1000);
        },
        /**
         * 处理稍后再看
         * @param {*} [data] 相当于变量声明
         */
        watchlater: async (data) => {
            let sort = JSON.parse(BLOD.getResourceText("sort"));
            let timer = window.setInterval(async () => {
                let tminfo = document.getElementsByClassName("tm-info");
                // 判断是否是稍后再看页面
                if (tminfo[0] && BLOD.aid) {
                    window.clearInterval(timer);
                    let child = tminfo[0].childNodes;
                    if (child[2].nodeType === 8) {
                        try {
                            // 通过链接获取tid
                            data = await xhr.true(BLOD.objUrl("https://api.bilibili.com/x/web-interface/view", { "aid": BLOD.aid }));
                            BLOD.tid = BLOD.jsonCheck(data).data.tid;
                            if (!(BLOD.tid in sort)) return;
                            // 创建分区信息节点并写入tid对应的分区数据
                            child[2].replaceWith(child[0].cloneNode(true));
                            child[4].replaceWith(child[0].cloneNode(true));
                            child[4].childNodes[1].remove();
                            child[2].childNodes[0].href = sort[sort[BLOD.tid][0]][2];
                            child[2].childNodes[0].innerText = sort[sort[BLOD.tid][0]][1];
                            child[4].childNodes[0].href = sort[BLOD.tid][2];
                            child[4].childNodes[0].innerText = sort[BLOD.tid][1];
                        }
                        catch (e) { e = Array.isArray(e) ? e : [e]; toast.error("分区信息", ...e); }
                    }
                }
            }, 1000);
        },
    }

    // 阻止直播间挂机检测
    class LiveSleep {
        constructor() {
            this.setInterval = setInterval;
            this.clock = 0;
            window.setInterval = (...args) => {
                if (args[1] && args[1] == 300000 && args[0] && args[0].toString() == "function(){e.triggerSleepCallback()}") {
                    if (!this.clock) {
                        toast.warning("成功阻止直播间挂机检测！", ...args);
                        this.clock++;
                    }
                    return Number.MIN_VALUE;
                }
                return this.setInterval.call(window, ...args);
            }
        }
        /**
         * 留待以后释放setInterval方法
         */
        release() {
            // 释放是不可能释放的，只要鼠标还在动这丫的就一直检测！
            window.setInterval = this.setInterval;
        }
    }
    BLOD.reset.disableLiveSleep = () => {
        if (config.reset.nosleep) new LiveSleep();
    }

    // 禁用直播间p2p上传
    BLOD.reset.fuckp2p = () => {
        if (!config.reset.nop2p) return;
        window.RTCPeerConnection = undefined;
        window.RTCDataChannel = () => { };
        toast.warning("禁用直播间p2p上传！");
    }

    // 获取播放通知信息
    const getLoc = async () => {
        try {
            let loc = await BLOD.xhr("https://api.bilibili.com/x/web-show/res/locs?pf=0&ids=142%2C2837%2C2836%2C2870%2C2953%2C2954%2C2955%2C2956");
            loc = JSON.parse(loc).data;
            for (let key in loc) {
                if (loc[key] && loc[key][0]) {
                    BLOD.loc = BLOD.loc || [];
                    loc[key].forEach(d => {
                        if (d.url) BLOD.loc.push([d.url, d.name]);
                    });
                }
            }
        } catch (e) { e = Array.isArray(e) ? e : [e]; debug.error("播放信息", ...e) }
    }
    if (config.reset.carousel && !BLOD.loc) getLoc();

    // 添加UP主列表
    BLOD.reset.uplist = () => {
        if (!BLOD.staff || !config.reset.uplist) return;
        let timer = setInterval(() => {
            let info = document.querySelector("#v_upinfo");
            if (info) {
                clearInterval(timer);
                let fl = '<span class="title">UP主列表</span><div class="up-card-box">';
                BLOD.staff.forEach(d => {
                    let mid = d.mid;
                    let face = d.face;
                    let title = d.title;
                    let vip = (d.vip && d.vip.status) ? 'name-text is-vip' : 'name-text';
                    let name = d.name;
                    fl = fl + [
                        '<div class="up-card">',
                        '<a href="//space.bilibili.com/',
                        mid,
                        '" data-usercard-mid="',
                        mid,
                        '" target="_blank" class="avatar"><img src="',
                        face,
                        '@48w_48h.webp" /><!----><span class="info-tag">',
                        title,
                        '</span><!----></a><div class="avatar"><a href="//space.bilibili.com/',
                        mid,
                        '" data-usercard-mid="',
                        mid,
                        '" target="_blank" class="',
                        vip,
                        '">',
                        name,
                        '</a></div></div>'
                    ].join("")
                })
                info.innerHTML = fl + '</div>';
            }
        }, 100);
    }

    // BV=>av
    class ParameterTrim {
        constructor() {
            this.param = JSON.parse(BLOD.getResourceText("search"));
            this.url = [];
            this.run();
        }
        /**
         * 处理入口
         * @param {*} a 有效则处理a标签
         */
        run(a) {
            this.loca();
            if (config.reset.bvid2av && a) this.aitm();
        }
        /**
         * 处理地址栏
         */
        loca() {
            this.url[1] = location.href;
            if (this.url[0] != this.url[1]) {
                let href = this.triming(location.href);
                if (!href.includes("#") && location.href.includes("#")) href = href + location.hash;
                window.history.replaceState(null, null, href);
                this.url[0] = location.href;
            }
        }
        /**
         * 处理a标签
         */
        aitm() {
            document.querySelectorAll("a").forEach(d => {
                if (d.href && this.url.indexOf(d.href) < 0) {
                    this.logout(d);
                    let hash = d.href.includes("#") ? "#" + d.href.split("#")[1] : "";
                    hash = hash.includes("/") ? "" : hash;
                    d.href = this.triming(d.href);
                    if (d.href.includes("?")) d.href = d.href + hash;
                    this.url.push(d.href);
                }
            })
        }
        /**
         * BV=>av
         * @param {string} url 被转化的链接
         */
        triming(url) {
            let obj = this.search(url);
            url = url.split("?")[0].split("/");
            url.forEach((d, i, e) => {
                if (d.includes("#")) d = d.split("#")[0];
                if (d.toLowerCase().startsWith('bv')) e[i] = "av" + BLOD.abv(d);
            });
            url = url.join("/");
            return BLOD.objUrl(url, obj);
        }
        /**
         * 清除无用参数
         * @param {string} url 带参数的链接
         */
        search(url) {
            let obj = BLOD.urlObj(url);
            if (obj.bvid) obj.aid = BLOD.abv(obj.bvid);
            this.param.forEach(d => {
                obj[d] = null;
            })
            return obj;
        }
        /**
         * 代理退出登录
         * @param {HTMLElement} he a标签
         */
        logout(he) {
            if (he.href.includes("account.bilibili.com/login?act=exit")) {
                he.href = "javascript:void(0);";
                he.onclick = async () => {
                    toast.warning("正在退出登录！")
                    let data = BLOD.jsonCheck(await xhr.post("https://passport.bilibili.com/login/exit/v2", "biliCSRF=" + BLOD.getCookies().bili_jct + "&gourl=" + encodeURIComponent(location.href)));
                    if (data.status) {
                        toast.success("退出登录！");
                        setTimeout(() => location.reload(), 1000);
                    }
                }
            }
        }
    }
    const parameterTrim = new ParameterTrim()
    BLOD.reset.parameterTrim = (a) => { return parameterTrim.run(a) };
})()
