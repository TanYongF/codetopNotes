// ==UserScript==
// @name         Codetop Notes 增强
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  在 Codetop 题目列表每行“笔记”按钮旁插入自定义按钮（初版）
// @author       YourName
// @match        https://codetop.cc/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // 工具函数：插入自定义按钮
    function insertCustomNoteButtons() {
        // 获取所有表格行的“笔记”按钮
        const noteButtons = document.querySelectorAll('td.el-table_1_column_6 > div > button:nth-child(2) > span');
        noteButtons.forEach(span => {
            // 获取“笔记”按钮
            const noteBtn = span.parentElement;
            // 获取按钮容器（通常是 <div>，包含多个按钮）
            const btnGroup = noteBtn.parentElement;
            // 避免重复插入
            if (btnGroup.querySelector('.ctn-custom-note-btn')) {
                // 按钮已存在，但要更新状态
                const existingBtn = btnGroup.querySelector('.ctn-custom-note-btn');
                let tr = existingBtn;
                while (tr && tr.tagName !== 'TR') tr = tr.parentElement;
                if (tr) {
                    const key = getRowKeyFromBtn(existingBtn);
                    loadNote(key).then(content => {
                        updateButtonState(existingBtn, content);
                    }).catch(err => {
                        console.error('更新按钮状态失败:', err);
                    });
                }
                return;
            }
            // 创建自定义按钮
            const btn = document.createElement('button');
            btn.className = noteBtn.className + ' ctn-custom-note-btn';
            btn.style.marginLeft = '6px';
            btn.innerHTML = '📝';
            btn.title = '自定义笔记';
            // 添加点击事件，弹出浮层
            btn.addEventListener('click', showCustomNoteModal);
            // 插入到“笔记”按钮后面
            btnGroup.insertBefore(btn, noteBtn.nextSibling);
            // 优化：如果该题存在笔记，按钮显示绿色
            let tr = btn;
            while (tr && tr.tagName !== 'TR') tr = tr.parentElement;
            if (tr) {
                const key = getRowKeyFromBtn(btn);
                loadNote(key).then(content => {
                    updateButtonState(btn, content);
                }).catch(err => {
                    console.error('加载笔记失败:', err);
                });
            }
        });
    }

    // IndexedDB 简单封装
    const DB_NAME = 'codetop_notes';
    const STORE_NAME = 'notes';

    // 只做最基础的open，不做任何超时、自动删除、reset、test等
    function openDB() {
        return new Promise((resolve, reject) => {
            const req = window.indexedDB.open(DB_NAME, 1);
            req.onupgradeneeded = function(e) {
                const db = e.target.result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME, { keyPath: 'key' });
                }
            };
            req.onsuccess = function(e) {
                resolve(e.target.result);
            };
            req.onerror = function(e) {
                console.error('数据库打开失败:', e);
                reject(e);
            };
            req.onblocked = function(e) {
                console.error('数据库被阻塞:', e);
                reject(new Error('数据库被阻塞'));
            };
        });
    }
    function saveNote(key, content) {
        return openDB().then(db => {
            return new Promise((resolve, reject) => {
                const tx = db.transaction(STORE_NAME, 'readwrite');
                const store = tx.objectStore(STORE_NAME);
                const putRequest = store.put({ key, content, updated_at: Date.now() });
                putRequest.onsuccess = () => {
                    resolve();
                };
                putRequest.onerror = (e) => {
                    console.error('保存笔记失败:', e);
                    reject(e);
                };
                tx.onerror = (e) => {
                    console.error('事务失败:', e);
                    reject(e);
                };
            });
        });
    }
    function loadNote(key) {
        return openDB().then(db => {
            return new Promise((resolve, reject) => {
                const tx = db.transaction(STORE_NAME, 'readonly');
                const store = tx.objectStore(STORE_NAME);
                const req = store.get(key);
                req.onsuccess = () => {
                    const result = req.result ? req.result.content : '';
                    resolve(result);
                };
                req.onerror = (e) => {
                    console.error('加载笔记失败:', e);
                    reject(e);
                };
                tx.onerror = (e) => {
                    console.error('事务失败:', e);
                    reject(e);
                };
            });
        });
    }

    // 更新按钮状态的工具函数
    function updateButtonState(btn, content) {
        if (content && content.trim()) {
            btn.style.background = '#67c23a';
            btn.style.color = '#fff';
            btn.style.borderColor = '#67c23a';
        } else {
            // 恢复默认状态
            btn.style.background = '';
            btn.style.color = '';
            btn.style.borderColor = '';
        }
    }

    // 获取当前行的题目链接 href 作为 key（第1列）
    function getRowKeyFromBtn(btn) {
        // 找到当前按钮所在的 tr
        let tr = btn;
        while (tr && tr.tagName !== 'TR') tr = tr.parentElement;
        if (!tr) return '';
        // 直接找第1列的 a 标签
        const firstTd = tr.querySelector('td.el-table_1_column_1');
        if (!firstTd) return '';
        const a = firstTd.querySelector('a');
        if (a && a.href) return a.href;
        return a ? a.textContent.trim() : '';
    }

    // 简单浮层（Modal）实现
    function showCustomNoteModal(e) {
        // 若已存在则不重复弹出
        if (document.querySelector('.ctn-modal-mask')) return;
        const btn = e.currentTarget;
        const noteKey = getRowKeyFromBtn(btn);
        // 先渲染 modal 骨架和 loading
        const mask = document.createElement('div');
        mask.className = 'ctn-modal-mask';
        mask.style = `
            position:fixed;left:0;top:0;width:100vw;height:100vh;background:rgba(0,0,0,0.3);z-index:9999;display:flex;align-items:center;justify-content:center;`;
        const modal = document.createElement('div');
        modal.className = 'ctn-modal';
        // 全屏样式
        modal.style = `
            background:#fff;
            padding:0;
            border-radius:0;
            width:100vw;
            height:100vh;
            max-width:100vw;
            max-height:100vh;
            box-shadow:none;
            position:relative;
            display:flex;
            flex-direction:row;
            gap:0;
            overflow:hidden;
        `;
        // 关闭按钮
        const closeBtn = document.createElement('span');
        closeBtn.innerHTML = '&times;';
        closeBtn.style = 'position:absolute;right:32px;top:24px;font-size:32px;cursor:pointer;z-index:2;';
        closeBtn.title = '关闭';
        closeBtn.onclick = () => {
            mask.remove();
            document.removeEventListener('keydown', escListener);
        };
        // ESC 键关闭浮层
        function escListener(ev) {
            if (ev.key === 'Escape') {
                mask.remove();
                document.removeEventListener('keydown', escListener);
            }
        }
        document.addEventListener('keydown', escListener);
        // 左右两栏骨架
        const left = document.createElement('div');
        left.style = 'flex:5;min-width:0;height:100vh;max-height:100vh;overflow:auto;display:flex;flex-direction:column;padding:48px 32px 32px 48px;box-sizing:border-box;';
        left.innerHTML = '<div style="padding:32px;text-align:center;">加载编辑器中...</div>';
        const right = document.createElement('div');
        right.style = 'flex:5;min-width:0;height:100vh;max-height:100vh;overflow:auto;border-left:1px solid #eee;padding:48px 48px 32px 48px;box-sizing:border-box;';
        right.innerHTML = '<div style="padding:32px;text-align:center;">加载预览中...</div>';
        // 组装
        modal.appendChild(closeBtn);
        modal.appendChild(left);
        modal.appendChild(right);
        mask.appendChild(modal);
        document.body.appendChild(mask);
        // 加载依赖后再初始化编辑器和预览
        loadEasyMDE(() => {
            left.innerHTML = '';
            right.innerHTML = '';
            const textarea = document.createElement('textarea');
            textarea.id = 'ctn-md-editor';
            // 保存按钮
            const saveBtn = document.createElement('button');
            saveBtn.textContent = '保存';
            saveBtn.style = 'margin:12px 0 0 0;align-self:flex-end;padding:6px 18px;background:#409EFF;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:16px;';
            // 保存提示
            const saveTip = document.createElement('span');
            saveTip.style = 'margin-left:12px;color:#67c23a;font-size:14px;display:none;';
            saveTip.textContent = '已保存！';
            left.appendChild(textarea);
            left.appendChild(saveBtn);
            left.appendChild(saveTip);
            right.innerHTML = '<div style="font-weight:bold;margin-bottom:8px;">实时预览</div><div id="ctn-md-preview" style="min-height:320px;"></div>';
            // 初始化 EasyMDE
            const easyMDE = new window.EasyMDE({
                element: textarea,
                autoDownloadFontAwesome: false,
                status: false,
                minHeight: '320px',
                spellChecker: false,
                placeholder: '请输入 Markdown 笔记...'
            });
            // 加载笔记内容
            loadNote(noteKey).then(content => {
                easyMDE.value(content);
                updatePreview();
            });
            // 实时预览
            function updatePreview() {
                const md = easyMDE.value();
                let renderMarkdown = md => md;
                if (window.marked) {
                    renderMarkdown = typeof window.marked === 'function'
                        ? window.marked
                        : (window.marked.marked ? window.marked.marked : renderMarkdown);
                }
                document.getElementById('ctn-md-preview').innerHTML = renderMarkdown(md);
                // 强制为所有 code 标签加上 hljs 类，并手动高亮
                document.getElementById('ctn-md-preview').querySelectorAll('pre code').forEach(block => {
                    block.classList.add('hljs');
                    if (window.hljs && typeof window.hljs.highlightElement === 'function') {
                        window.hljs.highlightElement(block);
                    }
                });
            }
            easyMDE.codemirror.on('change', updatePreview);
            // 保存按钮事件
            saveBtn.onclick = () => {
                const val = easyMDE.value();
                saveNote(noteKey, val).then(() => {
                    saveTip.style.display = '';
                    setTimeout(() => { saveTip.style.display = 'none'; }, 1200);
                    // 保存成功后更新按钮状态
                    updateButtonState(btn, val);
                }).catch(err => {
                    console.error('保存失败:', err);
                    alert('保存失败，请重试');
                });
            };
        });
    }

    // 动态加载 EasyMDE、marked、highlight.js
    function loadEasyMDE(cb) {
        ensureFontAwesome();
        // EasyMDE
        if (!window.EasyMDE) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = 'https://cdn.jsdelivr.net/npm/easymde/dist/easymde.min.css';
            document.head.appendChild(link);
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/easymde/dist/easymde.min.js';
            script.onload = () => {
                loadMarked(cb);
            };
            script.onerror = () => {
                alert('EasyMDE 加载失败，请检查网络');
            };
            document.body.appendChild(script);
        } else {
            loadMarked(cb);
        }
    }
    // 动态引入 FontAwesome 图标库
    function ensureFontAwesome() {
        if (!document.querySelector('link[href*="font-awesome"]')) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = 'https://cdn.jsdelivr.net/npm/font-awesome@4.7.0/css/font-awesome.min.css';
            document.head.appendChild(link);
        }
    }
    function loadMarked(cb) {
        if (!window.marked) {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/marked/marked.min.js';
            script.onload = () => {
                loadHLJS(cb);
            };
            script.onerror = () => {
                alert('marked 加载失败，请检查网络');
            };
            document.body.appendChild(script);
        } else {
            loadHLJS(cb);
        }
    }
    function loadHLJS(cb) {
        if (!window.hljs) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = 'https://unpkg.com/@highlightjs/cdn-assets@11.9.0/styles/atom-one-light.min.css';
            document.head.appendChild(link);
            const script = document.createElement('script');
            script.src = 'https://unpkg.com/@highlightjs/cdn-assets@11.9.0/highlight.min.js';
            script.onload = () => {
                // 配置 marked 的 highlight 选项
                if (window.marked && window.hljs) {
                    window.marked.setOptions({
                        highlight: function(code, lang) {
                            if (window.hljs.getLanguage(lang)) {
                                return window.hljs.highlight(code, { language: lang }).value;
                            }
                            return window.hljs.highlightAuto(code).value;
                        }
                    });
                }
                cb();
            };
            script.onerror = () => {
                alert('highlight.js 加载失败，请检查网络');
            };
            document.body.appendChild(script);
        } else {
            // 配置 marked 的 highlight 选项
            if (window.marked && window.hljs) {
                window.marked.setOptions({
                    highlight: function(code, lang) {
                        if (window.hljs.getLanguage(lang)) {
                            return window.hljs.highlight(code, { language: lang }).value;
                        }
                        return window.hljs.highlightAuto(code).value;
                    }
                });
            }
            cb();
        }
    }

    // 监听表格变化，保证按钮持续插入
    function observeTable() {
        // 监听整个页面的变化，不只是表格
        const targetNode = document.body;
        const observer = new MutationObserver((mutations) => {
            let shouldUpdate = false;
            
            mutations.forEach((mutation) => {
                // 检查是否有新增的节点包含表格行
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            // 检查是否是表格相关的变化
                            if (node.classList?.contains('el-table__body') || 
                                node.querySelector?.('.el-table__body') ||
                                node.querySelector?.('td.el-table_1_column_6') ||
                                node.tagName === 'TR' ||
                                node.classList?.contains('el-table__row') ||
                                node.querySelector?.('.el-table__row')) {
                                shouldUpdate = true;
                            }
                        }
                    });
                    
                    // 检查移除的节点
                    mutation.removedNodes.forEach((node) => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            if (node.tagName === 'TR' || 
                                node.classList?.contains('el-table__row')) {
                                shouldUpdate = true;
                            }
                        }
                    });
                }
                
                // 检查属性变化（可能的翻页触发）
                if (mutation.type === 'attributes' && 
                    (mutation.attributeName === 'class' || 
                     mutation.attributeName === 'style' ||
                     mutation.attributeName === 'data-key')) {
                    const target = mutation.target;
                    if (target.classList?.contains('el-table') ||
                        target.closest?.('.el-table') ||
                        target.classList?.contains('el-pagination') ||
                        target.closest?.('.el-pagination')) {
                        shouldUpdate = true;
                    }
                }
            });
            
            if (shouldUpdate) {
                // 延迟执行，确保DOM完全更新
                setTimeout(() => {
                    insertCustomNoteButtons();
                }, 100);
                
                // 再次更新确保状态正确
                setTimeout(() => {
                    insertCustomNoteButtons();
                }, 300);
            }
        });
        
        observer.observe(targetNode, { 
            childList: true, 
            subtree: true,
            attributes: true,
            attributeFilter: ['class', 'style']
        });
        
        // 额外监听分页按钮点击
        observePaginationClicks();
        
        // 定期检查（后备方案）
        setInterval(() => {
            insertCustomNoteButtons();
        }, 2000); // 每2秒检查一次，增加频率
    }
    
    // 监听分页按钮点击
    function observePaginationClicks() {
        // 监听分页相关的点击事件
        document.addEventListener('click', (e) => {
            const target = e.target;
            // 检查是否点击了分页相关按钮
            if (target.closest('.el-pagination') || 
                target.closest('.el-pager') ||
                target.classList.contains('btn-prev') ||
                target.classList.contains('btn-next') ||
                target.classList.contains('number') ||
                target.closest('.el-pagination__jump') ||
                target.closest('.el-pagination__sizes')) {
                
                // 立即尝试更新一次
                setTimeout(() => {
                    insertCustomNoteButtons();
                }, 500);
                
                // 再次延迟更新（确保加载完成）
                setTimeout(() => {
                    insertCustomNoteButtons();
                }, 1000);
                
                // 最后一次更新（确保状态正确）
                setTimeout(() => {
                    insertCustomNoteButtons();
                }, 1500);
            }
        });
        
        // 监听键盘事件（可能的分页快捷键）
        document.addEventListener('keydown', (e) => {
            if (e.key === 'PageUp' || e.key === 'PageDown' || 
                (e.key === 'Enter' && e.target.closest('.el-pagination'))) {
                setTimeout(() => {
                    insertCustomNoteButtons();
                }, 800);
            }
        });
        
        // 监听URL变化（可能的路由变化）
        let currentUrl = window.location.href;
        setInterval(() => {
            if (window.location.href !== currentUrl) {
                currentUrl = window.location.href;
                setTimeout(() => {
                    insertCustomNoteButtons();
                }, 1000);
            }
        }, 1000);
    }

    // 初始化
    function init() {
        insertCustomNoteButtons();
        observeTable();
    }

    // 页面插入导出/导入按钮区（只保留主按钮）
    function insertExportButton() {
        if (document.querySelector('.ctn-export-notes-btn-group')) return;
        const group = document.createElement('div');
        group.className = 'ctn-export-notes-btn-group';
        group.style = `
            position:fixed;
            right:36px;
            bottom:36px;
            z-index:10000;
            display:flex;
            flex-direction:column;
            gap:18px;
            align-items:flex-end;
        `;
        // 导出按钮
        const exportBtn = document.createElement('button');
        exportBtn.className = 'ctn-export-notes-btn';
        exportBtn.textContent = '导出笔记';
        exportBtn.style = btnStyle();
        exportBtn.onclick = exportAllNotes;
        // codetop导入按钮
        const importCodetopBtn = document.createElement('button');
        importCodetopBtn.className = 'ctn-import-codetop-btn';
        importCodetopBtn.textContent = 'codetop官方笔记 导入';
        importCodetopBtn.style = btnStyle('#67c23a');
        importCodetopBtn.onclick = showImportCodetopModal;
        // 插件导入按钮
        const importPluginBtn = document.createElement('button');
        importPluginBtn.className = 'ctn-import-plugin-btn';
        importPluginBtn.textContent = '插件笔记 导入';
        importPluginBtn.style = btnStyle('#e6a23c');
        importPluginBtn.onclick = showImportPluginModal;
        // 组装
        group.appendChild(exportBtn);
        group.appendChild(importCodetopBtn);
        group.appendChild(importPluginBtn);
        document.body.appendChild(group);
    }
    function btnStyle(bg) {
        return `
            background:${bg || '#409EFF'};
            color:#fff;
            border:none;
            border-radius:24px;
            padding:12px 28px;
            font-size:18px;
            box-shadow:0 2px 8px rgba(0,0,0,0.12);
            cursor:pointer;
        `;
    }
    // codetop导入弹窗
    function showImportCodetopModal() {
        showImportModal('codetop');
    }
    // 插件导入弹窗
    function showImportPluginModal() {
        showImportModal('plugin');
    }
    // 通用导入弹窗
    function showImportModal(type) {
        if (document.querySelector('.ctn-modal-mask')) {
            return;
        }
        // 遮罩
        const mask = document.createElement('div');
        mask.className = 'ctn-modal-mask';
        mask.style = 'position:fixed;left:0;top:0;width:100vw;height:100vh;background:rgba(0,0,0,0.3);z-index:99999;display:flex;align-items:center;justify-content:center;';
        // 弹窗
        const modal = document.createElement('div');
        modal.className = 'ctn-modal';
        modal.style = 'background:#fff;padding:32px 32px 24px 32px;border-radius:12px;min-width:420px;max-width:90vw;box-shadow:0 2px 16px rgba(0,0,0,0.15);position:relative;';
        // 关闭按钮
        const closeBtn = document.createElement('span');
        closeBtn.innerHTML = '&times;';
        closeBtn.style = 'position:absolute;right:18px;top:12px;font-size:28px;cursor:pointer;z-index:2;';
        closeBtn.title = '关闭';
        closeBtn.onclick = () => mask.remove();
        // 标题
        const title = document.createElement('div');
        title.style = 'font-size:20px;font-weight:bold;margin-bottom:18px;';
        title.textContent = type === 'codetop' ? '从 codetop 导入笔记' : '从插件导入笔记';
        // 内容区
        const content = document.createElement('div');
        content.style = 'margin-bottom:18px;';
        if (type === 'codetop') {
            content.innerHTML = '<textarea style="width:100%;height:120px;font-size:16px;padding:8px;box-sizing:border-box;resize:vertical;" placeholder="粘贴 codetop API 返回的 JSON 或 JSON 数组..."></textarea>';
        } else {
            content.innerHTML = '<input type="file" accept="application/json" style="font-size:16px;">';
        }
        // 导入按钮
        const importBtn = document.createElement('button');
        importBtn.textContent = '导入';
        importBtn.style = 'margin-top:8px;padding:8px 32px;background:#409EFF;color:#fff;border:none;border-radius:6px;font-size:16px;cursor:pointer;';
        // 提示
        const tip = document.createElement('div');
        tip.style = 'margin-top:12px;color:#67c23a;font-size:15px;display:none;';
        tip.textContent = '导入成功！';
        // 组装
        modal.appendChild(closeBtn);
        modal.appendChild(title);
        modal.appendChild(content);
        modal.appendChild(importBtn);
        modal.appendChild(tip);
        mask.appendChild(modal);
        document.body.appendChild(mask);
        // 导入逻辑
        importBtn.onclick = () => {
            importBtn.disabled = true;
            importBtn.textContent = '导入中...';
            
            if (type === 'codetop') {
                const val = content.querySelector('textarea').value;
                if (!val.trim()) {
                    alert('请输入要导入的JSON数据');
                    importBtn.disabled = false;
                    importBtn.textContent = '导入';
                    return;
                }
                let arr;
                try {
                    arr = JSON.parse(val);
                } catch (e) {
                    console.error('JSON解析失败:', e);
                    alert('JSON 格式错误: ' + e.message);
                    importBtn.disabled = false;
                    importBtn.textContent = '导入';
                    return;
                }
                if (!Array.isArray(arr)) arr = [arr];
                batchImportNotes(arr, type, tip, () => {
                    importBtn.disabled = false;
                    importBtn.textContent = '导入';
                });
            } else {
                const file = content.querySelector('input[type=file]').files[0];
                if (!file) {
                    alert('请选择文件');
                    importBtn.disabled = false;
                    importBtn.textContent = '导入';
                    return;
                }
                const reader = new FileReader();
                reader.onload = function(e) {
                    let arr;
                    try {
                        arr = JSON.parse(e.target.result);
                    } catch (err) {
                        console.error('文件JSON解析失败:', err);
                        alert('JSON 格式错误: ' + err.message);
                        importBtn.disabled = false;
                        importBtn.textContent = '导入';
                        return;
                    }
                    if (!Array.isArray(arr)) arr = [arr];
                    batchImportNotes(arr, type, tip, () => {
                        importBtn.disabled = false;
                        importBtn.textContent = '导入';
                    });
                };
                reader.onerror = function(e) {
                    console.error('文件读取失败:', e);
                    alert('文件读取失败');
                    importBtn.disabled = false;
                    importBtn.textContent = '导入';
                };
                reader.readAsText(file);
            }
        };
    }
    // 批量导入
    function batchImportNotes(arr, type, tip, callback) {
        
        // 先检查 IndexedDB 是否可用
        openDB().then(() => {
            return openDB();
        }).then(db => {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            let count = 0;
            let importedKeys = [];
            let processedCount = 0;
            let errors = [];
            
            if (arr.length === 0) {
                tip.textContent = '没有找到可导入的数据';
                tip.style.display = '';
                setTimeout(() => { tip.style.display = 'none'; }, 3000);
                if (callback) callback();
                return;
            }
            
            arr.forEach((item, index) => {
                let key, content;
                if (type === 'codetop') {
                    const slug = item.leetcodeInfo && item.leetcodeInfo.slug_title;
                    if (!slug) {
                        processedCount++;
                        checkComplete();
                        return;
                    }
                    key = `https://leetcode.cn/problems/${slug}`;
                    content = item.content || '';
                } else {
                    key = item.key || '';
                    content = item.content || '';
                }
                if (key) { // 只要有key就尝试导入，即使content为空
                    const putRequest = store.put({
                        key,
                        content: content || '', // 确保content不为undefined
                        updated_at: Date.now(),
                        ...(item.leetcodeInfo ? { leetcodeInfo: item.leetcodeInfo } : {})
                    });
                    putRequest.onsuccess = () => {
                        importedKeys.push(key);
                        count++;
                        processedCount++;
                        checkComplete();
                    };
                    putRequest.onerror = (e) => {
                        console.error('导入单条记录失败:', key, e);
                        errors.push(`${key}: ${e.message || e}`);
                        processedCount++;
                        checkComplete();
                    };
                } else {
                    processedCount++;
                    checkComplete();
                }
            });
            
            function checkComplete() {
                if (processedCount === arr.length) {
                    let message = `导入完成！成功导入 ${count} 条，跳过 ${arr.length - count} 条。`;
                    if (errors.length > 0) {
                        message += `\n错误 ${errors.length} 条`;
                    }
                    tip.textContent = message;
                    tip.style.color = count > 0 ? '#67c23a' : '#f56c6c';
                    tip.style.display = '';
                    tip.style.whiteSpace = 'pre-line'; // 支持换行显示
                    setTimeout(() => { tip.style.display = 'none'; }, 4000);
                    // 导入完成后刷新按钮状态
                    setTimeout(() => {
                        insertCustomNoteButtons();
                    }, 100);
                    if (callback) callback();
                }
            }
            
            tx.onerror = (e) => {
                console.error('事务失败:', e);
                tip.textContent = '导入失败，请重试';
                tip.style.color = '#f56c6c';
                tip.style.display = '';
                setTimeout(() => { tip.style.display = 'none'; }, 3000);
                if (callback) callback();
            };
        }).catch(err => {
            console.error('打开数据库失败:', err);
            tip.textContent = '数据库错误，请重试';
            tip.style.color = '#f56c6c';
            tip.style.display = '';
            setTimeout(() => { tip.style.display = 'none'; }, 3000);
            if (callback) callback();
        });
    }

    // 导出所有笔记为 JSON 文件
    function exportAllNotes() {
        openDB().then(db => {
            const tx = db.transaction(STORE_NAME, 'readonly');
            const store = tx.objectStore(STORE_NAME);
            const req = store.getAll();
            req.onsuccess = () => {
                const data = req.result || [];
                if (data.length === 0) {
                    alert('没有笔记可以导出');
                    return;
                }
                const json = JSON.stringify(data, null, 2);
                const blob = new Blob([json], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                const date = new Date().toISOString().slice(0, 10);
                a.href = url;
                a.download = `codetop_notes_${date}.json`;
                document.body.appendChild(a);
                a.click();
                setTimeout(() => {
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                }, 100);
            };
            req.onerror = (e) => {
                console.error('导出失败:', e);
                alert('导出失败，请重试');
            };
        }).catch(err => {
            console.error('打开数据库失败:', err);
            alert('数据库错误，无法导出');
        });
    }

    // 页面加载后执行
    window.addEventListener('load', () => {
        setTimeout(init, 300); // 延迟，确保表格渲染
        setTimeout(insertExportButton, 1200); // 插入导出/导入按钮
    });
})(); 