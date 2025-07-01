// Subtitle Generator - Main JavaScript File

class SubtitleGenerator {
    constructor() {
        this.isGenerating = false;
        this.isPlaying = false;
        this.currentSubtitles = null;
        this.animationFrame = null;
        this.startTime = 0;
        this.duration = 0;
        this.audioContext = null;
        this.audioBuffer = null;
        this.audioSource = null;
        this.inputMethod = 'script'; // Track input method
        
        this.initializeElements();
        this.bindEvents();
        this.setupAudioContext();
    }

    initializeElements() {
        // Form elements
        this.form = document.getElementById('subtitleForm');
        this.contentTextarea = document.getElementById('content');
        this.subtitleFontSelect = document.getElementById('subtitleFont');
        this.subtitleColorSelect = document.getElementById('subtitleColor');
        this.fontSizeSelect = document.getElementById('fontSize');
        
        // Input sections
        this.scriptInput = document.getElementById('scriptInput');
        this.srtInput = document.getElementById('srtInput');
        this.srtFileInput = document.getElementById('srtFile');
        
        // Preview elements
        this.subtitleCanvas = document.getElementById('subtitleCanvas');
        this.playBtn = document.getElementById('playBtn');
        this.pauseBtn = document.getElementById('pauseBtn');
        this.downloadBtn = document.getElementById('downloadBtn');
        this.downloadSrtBtn = document.getElementById('downloadSrtBtn');
        this.progressFill = document.getElementById('progressFill');
        this.progressText = document.getElementById('progressText');
        this.progressBar = document.querySelector('.modern-progress-bar');
        this.progressContainer = document.querySelector('.modern-progress-container');
        this.isSeeking = false;
        this.seekProgress = 0;
        
        // Modal elements
        this.loadingModal = document.getElementById('loadingModal');
        this.loadingText = document.getElementById('loadingText');
    }

    bindEvents() {
        // Form submission
        this.form.addEventListener('submit', (e) => this.handleFormSubmit(e));
        
        // Input method switching (modern UI: buttons)
        this.switchScriptBtn = document.getElementById('switchScript');
        this.switchSrtBtn = document.getElementById('switchSrt');
        if (this.switchScriptBtn && this.switchSrtBtn) {
            this.switchScriptBtn.addEventListener('click', () => this.setInputMethod('script'));
            this.switchSrtBtn.addEventListener('click', () => this.setInputMethod('srt'));
        }
        
        // Control buttons
        this.playBtn.addEventListener('click', () => this.playSubtitles());
        this.pauseBtn.addEventListener('click', () => this.pauseSubtitles());
        this.downloadBtn.addEventListener('click', () => this.downloadVideo());
        this.downloadSrtBtn.addEventListener('click', () => this.downloadSRT());
        
        // Real-time preview updates
        this.contentTextarea.addEventListener('input', () => this.updatePreview());
        this.subtitleFontSelect.addEventListener('change', () => this.updatePreview());
        this.subtitleColorSelect.addEventListener('change', () => this.updatePreview());
        this.fontSizeSelect.addEventListener('change', () => this.updatePreview());
        
        // Checkbox interactions
        document.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
            checkbox.addEventListener('change', () => this.updatePreview());
        });
        
        // Color options
        document.querySelectorAll('input[name="backgroundColor"]').forEach(radio => {
            radio.addEventListener('change', () => this.updatePreview());
        });
        
        // SRT file upload
        this.srtFileInput.addEventListener('change', (e) => this.handleSrtUpload(e));
        
        // Seek bar events
        if (this.progressBar && this.progressContainer) {
            this.progressBar.addEventListener('mousedown', (e) => this.startSeek(e));
            this.progressBar.addEventListener('touchstart', (e) => this.startSeek(e));
            window.addEventListener('mousemove', (e) => this.moveSeek(e));
            window.addEventListener('touchmove', (e) => this.moveSeek(e));
            window.addEventListener('mouseup', (e) => this.endSeek(e));
            window.addEventListener('touchend', (e) => this.endSeek(e));
        }
    }

    setupAudioContext() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.log('Web Audio API not supported');
        }
    }

    setInputMethod(method) {
        this.inputMethod = method;
        // Update button active states
        if (this.switchScriptBtn && this.switchSrtBtn) {
            this.switchScriptBtn.classList.toggle('active', method === 'script');
            this.switchSrtBtn.classList.toggle('active', method === 'srt');
        }
        // Show/hide input sections
        if (method === 'script') {
            this.scriptInput.style.display = 'block';
            this.srtInput.style.display = 'none';
        } else {
            this.scriptInput.style.display = 'none';
            this.srtInput.style.display = 'block';
        }
        // Reset state
        this.currentSubtitles = null;
        this.duration = 0;
        this.isPlaying = false;
        this.disableControls();
        this.clearPreview();
        this.updatePreview();
    }

    disableControls() {
        this.playBtn.disabled = true;
        this.pauseBtn.disabled = true;
        this.downloadBtn.disabled = true;
        this.downloadSrtBtn.disabled = true;
        this.progressFill.style.width = '0%';
        this.progressText.textContent = '0%';
    }

    clearPreview() {
        if (this.subtitleCanvas) {
            this.subtitleCanvas.innerHTML = '<div class="placeholder"><i class="fas fa-closed-captioning"></i><p>Your subtitles will appear here</p></div>';
        }
    }

    async handleFormSubmit(e) {
        e.preventDefault();
        if (this.isGenerating) return;
        // Gather form data
        const data = {
            content: this.contentTextarea.value,
            subtitleFont: this.subtitleFontSelect.value,
            subtitleColor: this.subtitleColorSelect.value,
            fontSize: this.fontSizeSelect.value,
            highlightKeywords: document.getElementById('highlightKeywords').checked,
            animatedText: document.getElementById('animatedText').checked,
            inputMethod: this.inputMethod
        };
        // Validate input
        if (data.inputMethod === 'script' && !data.content.trim()) {
            this.showNotification('Please enter some content for your subtitles!', 'error');
            return;
        }
        this.isGenerating = true;
        this.showLoadingModal();
        try {
            if (data.inputMethod === 'script') {
                await this.generateSubtitlesFromScript(data);
            }
            // SRT handled by upload event
        } catch (error) {
            console.error('Generation error:', error);
            this.showNotification('Error generating subtitles. Please try again.', 'error');
        } finally {
            this.isGenerating = false;
            this.hideLoadingModal();
        }
    }

    async generateSubtitlesFromScript(data) {
        const steps = [
            'Processing your script...',
            'Generating subtitle timings...',
            'Applying styling...',
            'Finalizing subtitles...'
        ];

        for (let i = 0; i < steps.length; i++) {
            this.updateLoadingText(steps[i]);
            this.updateProgress((i + 1) * 25);
            await this.delay(600 + Math.random() * 400);
        }

        // Create subtitles from script
        const words = data.content.split(' ');
        const estimatedDuration = words.length * 0.5; // 0.5 seconds per word
        this.currentSubtitles = this.createSubtitleTimings(words, estimatedDuration);
        this.duration = estimatedDuration * 1000;
        
        this.createSubtitleContent();
        this.enableControls();
        this.showNotification('Subtitles generated successfully!', 'success');
    }

    createSubtitleTimings(words, duration) {
        const subtitles = [];
        const wordsPerSecond = words.length / duration;
        let currentTime = 0;
        
        for (let i = 0; i < words.length; i += 3) { // Group words into phrases
            const phrase = words.slice(i, i + 3).join(' ');
            const phraseDuration = 3 / wordsPerSecond;
            
            subtitles.push({
                id: subtitles.length + 1,
                startTime: currentTime,
                endTime: currentTime + phraseDuration,
                text: phrase
            });
            
            currentTime += phraseDuration;
        }
        
        return subtitles;
    }

    createSubtitleContent() {
        // Clear previous content
        this.subtitleCanvas.innerHTML = '';
        
        // Create canvas for subtitle generation
        const canvas = document.createElement('canvas');
        canvas.width = 1920; // 16:9 aspect ratio
        canvas.height = 1080;
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        canvas.style.objectFit = 'contain';
        canvas.style.borderRadius = '12px';
        
        this.subtitleCanvas.appendChild(canvas);
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        
        // Generate initial frame
        this.drawSubtitleFrame(0);
    }

    drawSubtitleFrame(progress) {
        if (!this.ctx || !this.canvas || !this.currentSubtitles) return;
        
        const ctx = this.ctx;
        const width = this.canvas.width;
        const height = this.canvas.height;
        
        // Clear canvas
        ctx.clearRect(0, 0, width, height);
        
        // Draw background based on selection
        this.drawBackground(ctx, width, height);
        
        // Draw current subtitle
        const currentTime = progress * (this.duration / 1000);
        const currentSubtitle = this.getCurrentSubtitle(currentTime);
        
        if (currentSubtitle) {
            this.drawSubtitle(ctx, width, height, currentSubtitle, progress);
        }
    }

    drawBackground(ctx, width, height) {
        // If background color options exist, use them; otherwise default to green test
        let backgroundColor = 'green';
        const bgRadio = document.querySelector('input[name="backgroundColor"]:checked');
        if (bgRadio) backgroundColor = bgRadio.value;
        switch (backgroundColor) {  
            case 'green': ctx.fillStyle = '#00ff00'; break;
            case 'blue': ctx.fillStyle = '#0000ff'; break;
            case 'black': ctx.fillStyle = '#000000'; break;
            case 'transparent':
                // Checkerboard
                const size = 20;
                for (let x = 0; x < width; x += size) {
                    for (let y = 0; y < height; y += size) {
                        ctx.fillStyle = (x + y) % (size * 2) === 0 ? '#cccccc' : '#ffffff';
                        ctx.fillRect(x, y, size, size);
                    }
                }
                return;
        }
        ctx.fillRect(0, 0, width, height);
    }

    getCurrentSubtitle(currentTime) {
        return this.currentSubtitles.find(subtitle => 
            currentTime >= subtitle.startTime && currentTime <= subtitle.endTime
        );
    }

    drawSubtitle(ctx, width, height, subtitle, progress) {
        const fontFamily = this.subtitleFontSelect.value || 'Inter';
        const fontColor = this.subtitleColorSelect.value || '#ffffff';
        const fontSize = document.getElementById('fontSize').value;
        const highlightKeywords = document.getElementById('highlightKeywords').checked;
        const animatedText = document.getElementById('animatedText').checked;
        // Calculate font size
        const fontSizes = {
            small: 48,
            medium: 64,
            large: 80,
            'extra-large': 96
        };
        const size = fontSizes[fontSize] || fontSizes.medium;
        // Set text style
        ctx.font = `bold ${size}px ${fontFamily}, sans-serif`;
        ctx.fillStyle = fontColor;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        // Add shadow for white/yellow for visibility
        if (fontColor === '#ffffff' || fontColor === '#ffff00') {
            ctx.shadowColor = 'rgba(0,0,0,0.8)';
            ctx.shadowBlur = 8;
            ctx.shadowOffsetX = 2;
            ctx.shadowOffsetY = 2;
        } else {
            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;
        }
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 3;
        // Calculate text position (center vertically)
        const textY = height / 2;
        const maxWidth = width * 0.9;
        // Handle animated text
        let displayText = subtitle.text;
        let popOffset = 0;
        if (animatedText) {
            // Pop up in the first 0.2 of the progress for this subtitle
            const sentenceProgress = Math.min(progress * (this.duration / 1000) - subtitle.startTime, subtitle.endTime - subtitle.startTime);
            const popDuration = 0.4; // seconds
            let t = Math.max(0, Math.min(sentenceProgress / popDuration, 1));
            // Ease out cubic
            t = 1 - Math.pow(1 - t, 3);
            // y: 16px -> -5px -> 0px
            if (t < 0.5) {
                popOffset = 16 + (-(16 + 5) * (t * 2)); // 16 -> -5
            } else {
                popOffset = -5 + (5 * ((t - 0.5) * 2)); // -5 -> 0
            }
        }
        // Draw SRT-style background if selected
        if (this.srtBackground) {
            this.drawSRTBackground(ctx, width, height, displayText, size);
        }
        ctx.save();
        ctx.translate(width / 2, height / 2 + popOffset);
        // Draw text with word wrapping and pop effect
        this.drawWrappedText(ctx, displayText, 0, 0, maxWidth, size * 1.2, false, 1, popOffset);
        ctx.restore();
    }

    drawSRTBackground(ctx, width, height, text, fontSize) {
        // Calculate text dimensions
        const lines = text.split(' ');
        const maxLineWidth = Math.max(...lines.map(line => ctx.measureText(line).width));
        const lineHeight = fontSize * 1.2;
        const totalHeight = lines.length * lineHeight;
        
        // Calculate background dimensions
        const padding = 20;
        const bgWidth = maxLineWidth + (padding * 2);
        const bgHeight = totalHeight + (padding * 2);
        const bgX = (width - bgWidth) / 2;
        const bgY = (height - bgHeight) / 2;
        
        // Draw semi-transparent background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(bgX, bgY, bgWidth, bgHeight);
        
        // Draw border
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 2;
        ctx.strokeRect(bgX, bgY, bgWidth, bgHeight);
    }

    drawWrappedText(ctx, text, x, y, maxWidth, lineHeight, animatedText = false, progress = 1, popOffset = 0) {
        const keywords = ['amazing', 'technology', 'future', 'digital', 'create', 'better'];
        const words = text.split(' ');
        let line = '';
        let lines = [];
        // First, split into lines for wrapping
        for (let i = 0; i < words.length; i++) {
            const testLine = line + words[i] + ' ';
            const metrics = ctx.measureText(testLine);
            if (metrics.width > maxWidth && i > 0) {
                lines.push(line.trim());
                line = words[i] + ' ';
            } else {
                line = testLine;
            }
        }
        lines.push(line.trim());
        // Calculate total height for vertical centering
        const totalHeight = lines.length * lineHeight;
        let currentY = y - totalHeight / 2 + lineHeight / 2;
        // For animated pop effect
        let wordIndex = 0;
        for (let l = 0; l < lines.length; l++) {
            const lineWords = lines[l].split(' ');
            let lineX = x;
            // Calculate total line width for centering
            let totalLineWidth = 0;
            for (let w = 0; w < lineWords.length; w++) {
                totalLineWidth += ctx.measureText(lineWords[w] + ' ').width;
            }
            lineX = x - totalLineWidth / 2;
            for (let w = 0; w < lineWords.length; w++) {
                const word = lineWords[w];
                const wordWidth = ctx.measureText(word + ' ').width;
                // Highlight
                if (keywords.includes(word.toLowerCase())) {
                    ctx.save();
                    ctx.globalAlpha = 0.7;
                    ctx.fillStyle = '#ffff00';
                    ctx.fillRect(lineX, currentY - lineHeight / 2 + 8, wordWidth, lineHeight - 12);
                    ctx.restore();
                }
                // Draw the word
                if (ctx.strokeStyle) ctx.strokeText(word, lineX + wordWidth / 2, currentY);
                ctx.fillText(word, lineX + wordWidth / 2, currentY);
                lineX += wordWidth;
                wordIndex++;
            }
            currentY += lineHeight;
        }
        // Reset shadow
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
    }

    playSubtitles() {
        if (!this.currentSubtitles) return;
        this.isPlaying = true;
        if (this.isSeeking && this.seekProgress) {
            this.startTime = Date.now() - this.seekProgress * this.duration;
        } else {
            this.startTime = Date.now();
        }
        this.playBtn.disabled = true;
        this.pauseBtn.disabled = false;
        
        // Start subtitle animation
        this.animateSubtitles();
    }

    pauseSubtitles() {
        this.isPlaying = false;
        this.playBtn.disabled = false;
        this.pauseBtn.disabled = true;
        
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
        }
    }

    animateSubtitles() {
        if (!this.isPlaying) return;
        
        const elapsed = Date.now() - this.startTime;
        const progress = Math.min(elapsed / this.duration, 1);
        
        // Update progress bar visually
        this.progressFill.style.width = `${progress * 100}%`;
        this.progressText.textContent = `${this.formatTimeDisplay(progress * this.getDurationSeconds())} / ${this.formatTimeDisplay(this.getDurationSeconds())}`;
        
        // Draw current frame
        this.drawSubtitleFrame(progress);
        
        if (progress < 1 && !this.isSeeking) {
            this.animationFrame = requestAnimationFrame(() => this.animateSubtitles());
        } else if (!this.isSeeking) {
            this.subtitlesEnded();
        }
    }

    subtitlesEnded() {
        this.isPlaying = false;
        this.playBtn.disabled = false;
        this.pauseBtn.disabled = true;
        this.progressFill.style.width = '0%';
        this.progressText.textContent = `0:00 / ${this.formatTimeDisplay(this.getDurationSeconds())}`;
    }

    async downloadVideo() {
        if (!this.currentSubtitles || !this.canvas) return;
        const style = document.getElementById('subtitleStyle').value;
        // If SRT style is selected, automatically download SRT file instead
        if (style === 'srt') {
            this.downloadSRT();
            return;
        }
        // Use MediaRecorder to record the canvas as a WebM video
        const stream = this.canvas.captureStream(30); // 30 FPS
        const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
        let chunks = [];
        recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
        const durationMs = this.duration;
        // Animate subtitles from start to finish
        let resolveDone;
        const donePromise = new Promise(res => resolveDone = res);
        let startTime = null;
        let stopped = false;
        const animateFrame = (timestamp) => {
            if (!startTime) startTime = timestamp;
            const elapsed = timestamp - startTime;
            const progress = Math.min(elapsed / durationMs, 1);
            this.drawSubtitleFrame(progress);
            if (progress < 1 && !stopped) {
                requestAnimationFrame(animateFrame);
            } else {
                resolveDone();
            }
        };
        recorder.start();
        requestAnimationFrame(animateFrame);
        await donePromise;
        recorder.stop();
        // Wait for recording to finish
        await new Promise(res => { recorder.onstop = res; });
        const blob = new Blob(chunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `subtitles-${Date.now()}.webm`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        this.showNotification('WebM video downloaded!', 'success');
    }

    downloadSRT() {
        if (!this.currentSubtitles) return;
        
        let srtContent = '';
        this.currentSubtitles.forEach((subtitle, index) => {
            srtContent += `${index + 1}\n`;
            srtContent += `${this.formatTime(subtitle.startTime)} --> ${this.formatTime(subtitle.endTime)}\n`;
            srtContent += `${subtitle.text}\n\n`;
        });
        
        const blob = new Blob([srtContent], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `subtitles-${Date.now()}.srt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.showNotification('SRT file downloaded!', 'success');
    }

    formatTime(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        const ms = Math.floor((seconds % 1) * 1000);
        
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
    }

    updatePreview() {
        if (this.canvas && this.ctx && this.currentSubtitles) {
            this.drawSubtitleFrame(0.5); // Show middle frame for preview
            this.progressFill.style.width = '50%';
            this.progressText.textContent = `${this.formatTimeDisplay(this.getDurationSeconds() * 0.5)} / ${this.formatTimeDisplay(this.getDurationSeconds())}`;
        }
    }

    updateDownloadButtonText() {
        const style = document.getElementById('subtitleStyle').value;
        const downloadBtn = document.getElementById('downloadBtn');
        
        if (style === 'srt') {
            downloadBtn.innerHTML = '<i class="fas fa-file-text"></i> Download SRT';
        } else {
            downloadBtn.innerHTML = '<i class="fas fa-download"></i> Download Video';
        }
    }

    enableControls() {
        this.playBtn.disabled = false;
        this.downloadBtn.disabled = false;
        this.downloadSrtBtn.disabled = false;
    }

    showLoadingModal() {
        if (this.loadingModal) {
            this.loadingModal.classList.add('show');
        } else {
            // Fallback: show notification
            this.showNotification('Generating subtitles...', 'info');
        }
    }

    hideLoadingModal() {
        if (this.loadingModal) {
            this.loadingModal.classList.remove('show');
        }
    }

    updateLoadingText(text) {
        if (this.loadingText) {
            this.loadingText.textContent = text;
        }
    }

    updateProgress(percentage) {
        this.progressFill.style.width = `${percentage}%`;
        this.progressText.textContent = `${percentage}%`;
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        // Style the notification
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 8px;
            color: white;
            font-weight: 500;
            z-index: 1001;
            transform: translateX(100%);
            transition: transform 0.3s ease;
            background: ${type === 'error' ? '#e74c3c' : type === 'success' ? '#27ae60' : '#3498db'};
        `;
        
        document.body.appendChild(notification);
        
        // Animate in
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);
        
        // Remove after 3 seconds
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async handleSrtUpload(event) {
        const file = event.target.files[0];
        if (!file) return;
        try {
            this.showLoadingModal();
            this.updateLoadingText('Parsing SRT file...');
            const text = await file.text();
            this.currentSubtitles = this.parseSrt(text);
            if (this.currentSubtitles.length > 0) {
                // Estimate duration from last subtitle
                this.duration = (this.currentSubtitles[this.currentSubtitles.length - 1].endTime) * 1000;
                this.createSubtitleContent();
                this.enableControls();
                this.showNotification('SRT file loaded successfully!', 'success');
            } else {
                this.showNotification('No subtitles found in SRT file.', 'error');
            }
        } catch (error) {
            this.showNotification('Error parsing SRT file.', 'error');
        } finally {
            this.hideLoadingModal();
        }
    }

    parseSrt(srtText) {
        // Basic SRT parser
        const lines = srtText.split(/\r?\n/);
        const subtitles = [];
        let i = 0;
        while (i < lines.length) {
            // Skip index line
            if (!lines[i].trim() || isNaN(Number(lines[i].trim()))) { i++; continue; }
            i++;
            // Time line
            const timeMatch = lines[i].match(/(\d{2}:\d{2}:\d{2},\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2},\d{3})/);
            if (!timeMatch) { i++; continue; }
            const start = this.srtTimeToSeconds(timeMatch[1]);
            const end = this.srtTimeToSeconds(timeMatch[2]);
            i++;
            // Text lines
            let text = '';
            while (i < lines.length && lines[i].trim() !== '') {
                text += (text ? ' ' : '') + lines[i].trim();
                i++;
            }
            subtitles.push({
                id: subtitles.length + 1,
                startTime: start,
                endTime: end,
                text: text
            });
            i++;
        }
        return subtitles;
    }

    srtTimeToSeconds(timeStr) {
        const [h, m, sMs] = timeStr.split(':');
        const [s, ms] = sMs.split(',');
        return parseInt(h) * 3600 + parseInt(m) * 60 + parseInt(s) + parseInt(ms) / 1000;
    }

    getDurationSeconds() {
        return this.duration ? this.duration / 1000 : 0;
    }

    getCurrentTimeSeconds() {
        if (this.isPlaying) {
            return Math.min((Date.now() - this.startTime) / 1000, this.getDurationSeconds());
        } else if (this.isSeeking) {
            return this.seekProgress * this.getDurationSeconds();
        } else {
            return 0;
        }
    }

    startSeek(e) {
        if (!this.currentSubtitles || !this.duration) return;
        this.isSeeking = true;
        this.updateSeek(e);
    }

    moveSeek(e) {
        if (!this.isSeeking) return;
        this.updateSeek(e);
    }

    endSeek(e) {
        if (!this.isSeeking) return;
        this.updateSeek(e);
        this.isSeeking = false;
        // Seek to the new time
        if (this.duration) {
            const seekTime = this.seekProgress * this.duration;
            this.startTime = Date.now() - seekTime;
            this.drawSubtitleFrame(this.seekProgress);
            this.progressFill.style.width = `${this.seekProgress * 100}%`;
            this.progressText.textContent = `${this.formatTimeDisplay(this.seekProgress * this.getDurationSeconds())} / ${this.formatTimeDisplay(this.getDurationSeconds())}`;
        }
    }

    updateSeek(e) {
        let clientX;
        if (e.touches && e.touches.length) {
            clientX = e.touches[0].clientX;
        } else {
            clientX = e.clientX;
        }
        const rect = this.progressBar.getBoundingClientRect();
        let percent = (clientX - rect.left) / rect.width;
        percent = Math.max(0, Math.min(1, percent));
        this.seekProgress = percent;
        this.progressFill.style.width = `${percent * 100}%`;
        this.progressText.textContent = `${this.formatTimeDisplay(percent * this.getDurationSeconds())} / ${this.formatTimeDisplay(this.getDurationSeconds())}`;
        this.drawSubtitleFrame(percent);
    }

    formatTimeDisplay(seconds) {
        if (isNaN(seconds)) return '0:00';
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m}:${s.toString().padStart(2, '0')}`;
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new SubtitleGenerator();
    
    // Add some sample content for demonstration
    const sampleContent = "Welcome to our amazing subtitle generator! This tool can create professional subtitles with green screen backgrounds. Perfect for video editing and content creation.";
    
    // Set sample content after a short delay
    setTimeout(() => {
        const contentTextarea = document.getElementById('content');
        if (contentTextarea && !contentTextarea.value) {
            contentTextarea.value = sampleContent;
            contentTextarea.dispatchEvent(new Event('input'));
        }
    }, 1000);
});

// Add some additional interactive features
document.addEventListener('DOMContentLoaded', () => {
    // Add hover effects to feature cards
    const featureCards = document.querySelectorAll('.feature-card');
    featureCards.forEach(card => {
        card.addEventListener('mouseenter', () => {
            card.style.transform = 'translateY(-10px) scale(1.02)';
        });
        
        card.addEventListener('mouseleave', () => {
            card.style.transform = 'translateY(0) scale(1)';
        });
    });
    
    // Add character counter to textarea
    const contentTextarea = document.getElementById('content');
    if (contentTextarea) {
        const counter = document.createElement('div');
        counter.className = 'char-counter';
        counter.style.cssText = `
            text-align: right;
            font-size: 0.8rem;
            color: #666;
            margin-top: 5px;
        `;
        contentTextarea.parentNode.appendChild(counter);
        
        const updateCounter = () => {
            const count = contentTextarea.value.length;
            counter.textContent = `${count} characters`;
        };
        
        contentTextarea.addEventListener('input', updateCounter);
        updateCounter();
    }
});

// FAQ Accordion
function setupFaqAccordion() {
    const faqItems = document.querySelectorAll('.faq-item');
    faqItems.forEach(item => {
        const btn = item.querySelector('.faq-question');
        const answer = item.querySelector('.faq-answer');
        btn.addEventListener('click', () => {
            const isOpen = item.classList.contains('open');
            // Close all
            faqItems.forEach(i => {
                i.classList.remove('open');
                i.querySelector('.faq-question').setAttribute('aria-expanded', 'false');
            });
            // Open this one if it was closed
            if (!isOpen) {
                item.classList.add('open');
                btn.setAttribute('aria-expanded', 'true');
            }
        });
        // Keyboard accessibility
        btn.addEventListener('keydown', e => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                btn.click();
            }
        });
    });
}
document.addEventListener('DOMContentLoaded', () => {
    setupFaqAccordion();
    // ... existing code ...
}); 