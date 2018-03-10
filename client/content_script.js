const APP_PREFIX = 'dynamic_gazo';
const dynamicGazo = window.dynamicGazo

const sendChromeMsg = (json, callback) => {
    chrome.runtime.sendMessage(json, callback);
};

class ScreenShot {
    constructor () {
        this.CROP_BOX_SIZE = 150;
        this.uiInit();
        this.positionLastRclick = [200, 200];
        this.linkdata = null;
        this.tmp = {
            // 右クリックされた画像要素
            '$contextMenuImg': []
        };
        this.inlineViewer = null;

        // アプリケーションとしてSVG撮影を使う場合，アプリ名がセットされる
        this.app = null;
    }

    renderCropper (boxParams = []) {
        var self = this;
        self.initCropperMain(boxParams, null)
    }

    uiInit () {
        this.bindEvents();
    }

    // 切り抜きボックス, a要素カバーボックス
    $genCropper () {
        var $cropper = $(`<div class="daiz-ss-cropper" style="position: fixed;"></div>`);
        $cropper.css({
            top   : 0,
            left  : 0,
            width : this.CROP_BOX_SIZE,
            height: this.CROP_BOX_SIZE
        });
        return $cropper;
    }

    // true : 表示中のウェブページをスクロール不可にする
    // false: 解除する
    fixHtml (fg) {
        var fg = fg || false;
        if (fg) {
            $('html').css({
                height  : '100%',
                width   : '100%',
                overflow: 'hidden'
            })
        }else {
            $('html').css({
                height  : '',
                width   : '',
                overflow: 'auto'
            })
        }
    }

    // 範囲指定のための長方形を表示する
    initCropperMain (boxParams=[], $scrapboxSelectBox=null) {
        var $cropper = this.$genCropper();
        var closeBtnImg = chrome.extension.getURL('./image/x.png');
        var $closeBtn = $(`<div id="${APP_PREFIX}-daiz-ss-cropper-close" class="daiz-ss-cropper-close"></div>`);
        var $captureBtn = $(`<div id="${APP_PREFIX}-daiz-ss-cropper-capture"
            class="daiz-ss-cropper-capture">Capture</div>`);
        var $scrapboxBtn = $('<div id="daiz-ss-cropper-scrapbox">Scrap</div>');
        $closeBtn.css({
            'background-image': `url(${closeBtnImg})`
        });

        $cropper[0].className = 'daiz-ss-cropper-main';
        $cropper[0].id = `${APP_PREFIX}-daiz-ss-cropper-main`;
        // 切り抜きボックスの位置を初期化
        if (boxParams.length === 0) {
            $cropper.css({
                left  : this.positionLastRclick[0] - (this.CROP_BOX_SIZE / 2),
                top   : this.positionLastRclick[1] - (this.CROP_BOX_SIZE / 2),
                width : this.CROP_BOX_SIZE,
                height: this.CROP_BOX_SIZE
            });
        }else {
            $cropper.css({
                left  : boxParams[0],
                top   : boxParams[1],
                width : boxParams[2],
                height: boxParams[3]
            });
        }
        $cropper.append($captureBtn);
        if ($scrapboxSelectBox !== null) {
            $cropper.append($scrapboxBtn);
            $cropper.append($scrapboxSelectBox);
        }
        $cropper.append($closeBtn);
        this.movable($cropper)
        $('body').append($cropper);

        // XXX: 以下を有効化しないとダメ
        this._setRects();
    }

    movable ($cropper) {
        // ドラッグ可能にする
        $cropper.draggable({
            stop: (ev, ui) => {
                this._setRects();
            }
        });

        // リサイズ可能にする
        $cropper.resizable({
            stop: (ev, ui) => {
                this._setRects();
            },
            handles: "all"
        });
    }

    _setRects () {
        var $cropper = $(`#${APP_PREFIX}-daiz-ss-cropper-main`);
        const range= $cropper[0].getBoundingClientRect();
        if (range === undefined) return;
        this.removeCropper();
        // range: scroll量を加味しないpx値
        this.linkdata = this.setRects(range);
    }

    // ページ上で選択されている文字列を取得
    getSelectedText () {
        var self = this;
        var selection = window.getSelection();
        var text = selection.toString();
        return text;
    }

    setRects (range) {
        this.fixHtml(true)
        const $cropperMain = $(this.removeCropperMain())
        const anchorsInArea = new dynamicGazo.AnchorsInArea(document)
        anchorsInArea.options.detail = true
        const aTags = anchorsInArea.find(range)

        this.movable($cropperMain)
        $('body').append($cropperMain)

        // リンク以外のテキスト:
        var text = this.getSelectedText();
        $('#daiz-ss-cropper-main').attr('title', text);

        // リンク: 切り抜かれた形内のみ，aタグを覆えばよい
        var aTagRects = [];
        for (var i = 0; i < aTags.length; i++) {
            var aTag = aTags[i];
            var rect = aTag.position
            if (rect !== undefined) {
                // リンク要素の位置と大きさに合わせて，長方形カバーを被せる
                const $cropper = this.$genCropper();
                $cropper.css({
                    width : rect.width,
                    height: rect.height,
                    left  : rect.left,
                    top   : rect.top
                });
                var aid = `daiz-ss-a${i}`;
                var pos = this.correctPosition(rect, range);
                pos.id = aid;
                pos.href = aTag.url;
                pos.text = aTag.text;
                pos.fontSize = $(aTag.ref).css('font-size');
                pos.fontFamily = $(aTag.ref).css('font-family');

                $cropper.attr('title', aTag.url);
                $cropper.attr('id', aid);
                $('body').append($cropper);
                aTagRects.push(pos);
            }
        }

        // 切り取り領域
        var pos_cropper = {
            x     : 0,
            y     : 0,
            orgX  : range.left,
            orgY  : range.top,
            width : range.width,
            height: range.height
        };

        var title = document.title || '';
        if (title.length === 0) {
            // PDFページの場合，embedタグからファイル名を抽出して
            // titleとする
            var embeds = $('embed');
            if (embeds.length > 0 && embeds[0].type === 'application/pdf') {
                var pdfPath = '/' + embeds[0].src;
                var toks = pdfPath.split('/');
                title = toks[toks.length - 1];
            }
        }

        var res = {
            cropperRect : pos_cropper,
            aTagRects   : aTagRects,
            text        : text,
            winW        : window.innerWidth,
            winH        : window.innerHeight,
            baseUri     : window.location.href,
            title       : title
        };
        return res;
    }

    // aタグの位置補正
    // stageRectの左端，上端を基準とした距離表現に直す
    // aTagRect ⊂ stageRect は保証されている
    correctPosition (aTagRect, stageRect) {
        // XXX: scrollの扱いを詰める必要あり
        let res = {};
        const x1 = aTagRect.left - stageRect.left;
        // var x2 = (aTagRect.left + aTagRect.width) - stageRect.left;
        const y1 = aTagRect.top - stageRect.top;
        // var y2 = (aTagRect.top + aTagRect.height) - stageRect.top;
        res = {
            x     : x1,
            y     : y1,
            width : aTagRect.width,
            height: aTagRect.height
        };
        return res;
    }

    // 描画されている長方形カバーを全て消去
    removeCropper () {
        $('.daiz-ss-cropper').remove();
    }

    getCropperMain () {
        return $(".daiz-ss-cropper-main")[0]
    }

    removeCropperMain () {
        const $elem = $(".daiz-ss-cropper-main")
        $elem.draggable('destroy')
        $elem.resizable('destroy')
        const copy = $elem[0].cloneNode(true)
        $elem.remove();
        return copy
    }

    capture (mode='capture', scrapboxBoxId='') {
        var self = this;
        var res = [];
        window.getSelection().removeAllRanges();

        // 切り取りボックス内のa要素
        if (self.linkdata.aTagRects) {
            for (var j = 0; j < self.linkdata.aTagRects.length; j++) {
                var aTagDatum = self.linkdata.aTagRects[j];
                var aid = aTagDatum.id;
                if ($(`#${aid}`).length > 0) {
                    res.push(aTagDatum);
                }
            }
        }
        self.linkdata.aTagRects = res;

        self.removeCropperMain();
        self.removeCropper();
        self.fixHtml(false);

        // ページから不要なdivが消去されてからスクリーンショットを撮りたいので，
        // 1秒待ってから送信する
        window.setTimeout(() => {
            // MacBook ProのRetinaディスプレイなどの高解像度な
            // ディスプレイを使用している場合は1より大きな値となる
            var rat = Math.max(window.devicePixelRatio, 1.0);
            if (scrapboxBoxId.length === 0) mode = 'capture';
            if (self.linkdata !== null) {
                var appName = self.app;
                self.app = null;
                sendChromeMsg({
                    command: 'make-screen-shot',
                    options: {
                        sitedata: self.linkdata,
                        mode: mode,
                        scrapbox_box_id: scrapboxBoxId,
                        app: appName,
                        dpr: rat
                    }
                });

            }
        }, 900);
    }

    bindEvents () {
        var self = this;
        var $body = $('body');

        // cropperがクリックされたとき
        // 自身を消去する
        $body.on('click', '.daiz-ss-cropper', ev => {
            $(ev.target).closest('.daiz-ss-cropper').remove();
        });

        // 撮影ボタンがクリックされたとき
        $body.on('click', `#${APP_PREFIX}-daiz-ss-cropper-capture`, () => {
            this.capture('capture');
        });

        // 切り抜きボックスの閉じるボタンがクリックされたとき
        $body.on('click', `#${APP_PREFIX}-daiz-ss-cropper-close`, ev => {
            this.removeCropper();
            this.removeCropperMain();
            this.fixHtml(false);
        });

        // 画像上での右クリックを追跡
        $body.on('contextmenu', 'img', ev => {
            var $img = $(ev.target).closest('img');
            this.tmp.$contextMenuImg = $img;
        });

        $body.on('contextmenu', '.card-thumbnail', ev => {
            var $img = $(ev.target).closest('.card-area').find('.card-img');
            this.app = 'linkcard';
            self.tmp.$contextMenuImg = $img;
        });

        // ページでの右クリックを検出
        $(window).bind('contextmenu', (e) => {
            this.positionLastRclick = [e.clientX, e.clientY];
        });

        // コンテキストメニュー（右クリックメニュー）が押された通知をbackgroundページから受け取る
        chrome.extension.onRequest.addListener((request, sender, sendResponse) => {
            var re = request.event;
            if (re === 'click-context-menu') {
                // 撮影領域を選択するやつを表示
                if (request.elementType === 'image' || this.tmp.$contextMenuImg.length > 0) {
                    var $img = this.tmp.$contextMenuImg;
                    var imgRect = $img[0].getBoundingClientRect();
                    this.tmp.$contextMenuImg = [];
                    this.renderCropper([
                        imgRect.left,
                        imgRect.top,
                        $img.width(),
                        $img.height()
                    ]);
                }else {
                    this.renderCropper();
                }
            }
        });

        $body.on('click', '.card-close', ev => {
            $('.card-area').remove();
        });
    }
}
var ss = new ScreenShot();

chrome.extension.onRequest.addListener((request, sender, sendResponse) => {
    var mark = "chrome-ext";
    if (request.event === 'updated-location-href') {
        var $body = $('body');
        if ($body.length > 0) {
            $body[0].dataset.stat_daiz_svgss = mark;
        }
        if (ss.inlineViewer === null) {
            ss.inlineViewer = new InlineViewer();
        }
    }
});
