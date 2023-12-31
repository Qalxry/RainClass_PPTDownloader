// ==UserScript==
// @name         雨课堂课件PDF下载脚本
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  修复雨课堂电脑网页端下载PDF课件的排版错误，并且去除水印和其他无关信息，最大程度还原PPT原本的样子。
// @author       ShizuriYuki
// @match        https://www.yuketang.cn/web/print
// @require      https://cdnjs.cloudflare.com/ajax/libs/jspdf/1.5.3/jspdf.debug.js
// @grant        none
// @run-at       document-idle
// ==/UserScript==

const waitingCSSText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%,-50%);
    z-index: 9999;
    font-size: 30px;
    color: white;
    border: none;
    outline: none;
    border-radius: 10px;
    padding: 10px 20px;
    opacity: 1;
    background: rgba(0,0,0,0.6);
`;

const downloadButtonCSSText = `
    color: #000000;
    background-color: #ffffff;
    border: 1px solid #000000;
    border-radius: 3px;
    padding: 5px 10px;
    margin-left: 10px;
    cursor: pointer;
`;

(function () {
    "use strict";

    // 检测是否在课件打印页面
    var headerDiv = document.querySelector(".controls-panel");
    if (headerDiv == null) {
        return;
    }

    // 创建一个 div 用于显示加载中
    var waiting = document.createElement("div");
    waiting.style.cssText = waitingCSSText;

    // 创建一个按钮元素
    var button = document.createElement("button");
    button.textContent = "下载PDF - 简洁模式";
    button.style.cssText = downloadButtonCSSText;

    // 添加点击效果
    button.onmousedown = function () {
        this.style.transform = "scale(0.9)";
        this.style.backgroundColor = "#ddd";
    };

    // 当松开鼠标按钮时恢复
    button.onmouseup = function () {
        this.style.transform = "scale(1)";
        this.style.backgroundColor = "#ffffff";
    };

    // 一旦失去鼠标焦点，也应该恢复初始状态
    button.onmouseleave = function () {
        this.style.transform = "scale(1)";
        this.style.backgroundColor = "#ffffff";
    };

    // 当按钮被点击时
    button.addEventListener("click", async () => {
        // 按钮不可用
        button.disabled = true;

        // 在页面添加一个 div 用于显示加载中
        waiting.style.color = "white";
        document.body.appendChild(waiting);

        // 获取所有的PPT图片
        waiting.innerHTML = "正在获取所有课件图片...";
        const HTMLImageElems_tmp = document.querySelectorAll(".pptimg");    // class="pptimg" 的 img 标签
        
        // 移除不是img标签的元素，有的课件中会有一些也含有pptimg类的其他的元素，比如div，这些元素不是img标签，会导致jsPDF报错
        var HTMLImageElems = [];
        for (let i = 0; i < HTMLImageElems_tmp.length; i++) {
            if (HTMLImageElems_tmp[i].tagName == "IMG") {
                HTMLImageElems.push(HTMLImageElems_tmp[i]);
            }
        }

        // 获取第一张图片的宽高，作为 PDF 的宽高，因为是PPT的图片，所以宽高都是一样的
        const firstImg = HTMLImageElems[0];
        const width = firstImg.naturalWidth;
        const height = firstImg.naturalHeight;

        const pdf = new jsPDF({
            orientation: "l",
            unit: "px",
            format: [width, height],
        });

        // 使用for...of循环处理所有图片
        var count = 0;
        const combineText = "正在合成PDF：";
        for (let imgElem of HTMLImageElems) {
            await new Promise((resolve, reject) => {
                const image = new Image();
                image.onload = () => {
                    try {
                        // 图片加载完成后添加到PDF
                        if (count > 0) pdf.addPage();
                        pdf.addImage(imgElem, "PNG", 0, 0, pdf.internal.pageSize.getWidth(), pdf.internal.pageSize.getHeight());
                        count++;
                        waiting.innerHTML = `${combineText}${count}/${HTMLImageElems.length}页`;
                        resolve();
                    } catch (error) {
                        reject(error);
                    }
                };
                image.onerror = (error) => {
                    console.log(error);
                    console.log(image)
                    console.log(imgElem)
                    reject(new Error("Image loading failed: " + error.message));
                    waiting.innerHTML = "图片加载失败";
                    waiting.style.color = "red";
                    setTimeout(() => {
                        button.disabled = false;
                        document.body.removeChild(waiting);
                    }, 2000);
                };
                image.src = imgElem.src;
            });
        }

        // 获取标题
        let title = document.title.trim();
        waiting.innerHTML = `开始下载：${title}.pdf`;
        pdf.save(title + ".pdf");

        // 删除加载中的 div
        document.body.removeChild(waiting);

        // 按钮恢复可用
        button.disabled = false;
    });

    // 将按钮作为最后一个子元素添加到 headerDiv 中
    headerDiv.appendChild(button);

})();
