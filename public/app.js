// ================================
// STATE MANAGEMENT
// ================================
let selectedFile = null;
let cameraStream = null;
let autoMode = true; // Always auto mode
let hands = null;
let lastCaptureTime = 0;
let handDetected = false;
let isProcessing = false; // prevent duplicate auto runs
let hasShownResult = false; // prevent retrigger after result
let mpCamera = null; // MediaPipe camera instance
let handTimerId = null; // stability timer
let mediaPipeFailed = false; // Track if MediaPipe has failed
let currentCameraIndex = 0;
let availableCameras = [];

// Audio context and sounds
let audioContext = null;
let sounds = {};
let soundEnabled = true; // Sound toggle state
let backgroundMusic = null; // Background music audio element
let isBackgroundPlaying = false; // Background music state
let backgroundVolume = 0.6; // Background music volume (0-1) - increased for better audibility

// ================================
// DOM ELEMENTS
// ================================
const elements = {
    uploadArea: document.getElementById('uploadArea'),
    palmInput: document.getElementById('palmInput'),
    uploadPlaceholder: document.getElementById('uploadPlaceholder'),
    imagePreview: document.getElementById('imagePreview'),
    previewImg: document.getElementById('previewImg'),
    removeBtn: document.getElementById('removeBtn'),
    fortuneBtn: document.getElementById('fortuneBtn'),
    loadingSection: document.getElementById('loadingSection'),
    resultSection: document.getElementById('resultSection'),
    fortuneResult: document.getElementById('fortuneResult'),
    newReadingBtn: document.getElementById('newReadingBtn'),
    shareBtn: document.getElementById('shareBtn'),
    // Camera elements
    cameraSection: document.getElementById('cameraSection'),
    cameraVideo: document.getElementById('cameraVideo'),
    captureCanvas: document.getElementById('captureCanvas'),
    handDetectionBox: document.getElementById('handDetectionBox'),
    autoCaptureIndicator: document.getElementById('autoCaptureIndicator'),
    cameraStatus: document.getElementById('cameraStatus'),
    fortuneTellerText: document.getElementById('fortuneTellerText')
};

// ================================
// MESSAGES
// ================================
const messages = {
    fortuneError: '❌ Oops! Thầy bói gặp sự cố khi nhìn vận mệnh của bạn. Vui lòng thử lại!',
    uploadError: '❌ Có lỗi khi tải ảnh lên. Vui lòng thử lại!',
    shareSuccess: '✅ Đã sao chép vận mệnh vào clipboard!',
    shareError: '❌ Không thể chia sẻ. Vui lòng thử lại!',
    invalidFile: '❌ Vui lòng chỉ chọn file ảnh (JPG, PNG, WEBP)!',
    cameraNotSupported: '❌ Trình duyệt không hỗ trợ camera.',
    cameraPermissionDenied: '❌ Không thể truy cập camera. Vui lòng kiểm tra quyền truy cập.'
};

// ================================
// FILE HANDLING
// ================================
function handleFileSelect(file) {
    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
        alert(messages.invalidFile);
        return;
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
        alert('❌ File size must be less than 10MB!');
        return;
    }

    selectedFile = file;

    // Only show preview if not in auto mode (camera mode)
    if (!autoMode) {
        // Show preview
        const reader = new FileReader();
        reader.onload = (e) => {
            if (elements.previewImg) { // Guard against null
                elements.previewImg.src = e.target.result;
                elements.uploadPlaceholder.classList.add('hidden');
                elements.imagePreview.classList.remove('hidden');
            }
            elements.fortuneBtn.disabled = false;
        };
        reader.readAsDataURL(file);
    } else {
        // In auto mode, just enable fortune button
        elements.fortuneBtn.disabled = false;
    }
}

function resetUpload() {
    document.body.classList.remove('bg-frame');
    selectedFile = null;
    if (elements.palmInput) {
        elements.palmInput.value = '';
    }
    if (elements.previewImg) {
        elements.previewImg.src = '';
    }
    if (elements.imagePreview) {
        elements.imagePreview.classList.add('hidden');
    }
    if (elements.uploadPlaceholder) {
        elements.uploadPlaceholder.classList.remove('hidden');
    }
    elements.fortuneBtn.disabled = true;
}

// ================================
// FORTUNE TELLING
// ================================
async function getFortune() {
    
    if (!selectedFile) {
        return;
    }
    if (isProcessing) {
        return;
    }
    
    isProcessing = true;
    playSound('startScanning'); // Play magical sparkle sound when starting
    playSound('mysticalWhoosh'); // Add mystical transition effect
    startFortuneMusic(); // Start suspenseful fortune music

    try {
        // Show loading
        document.querySelector('.upload-section').classList.add('hidden');
        elements.resultSection.classList.add('hidden');
        elements.loadingSection.classList.remove('hidden');
        
        // Fortune teller is analyzing (keep current message)
        // Don't change message here, keep the capture message

        // Create form data
        const formData = new FormData();
        formData.append('palmImage', selectedFile);
        formData.append('masterType', selectedFortuneMaster); // Add selected fortune master
        formData.append('language', 'vi');

        // Call API
        const response = await fetch('/api/fortune-telling', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();
        if (!response.ok) {
            if (data && data.error === 'MODEL_OVERLOADED') {
                throw new Error('MODEL_OVERLOADED');
            }
            throw new Error(data && data.message || 'API error');
        }
        if (data.success) {
            // Update usage counter display (backend already incremented)
            loadUsageCount();
            
            playSound('fortuneComplete'); // Play mystical completion sound
            playSound('mysticalBell'); // Add ethereal bell effect
            
            // Show result with special sound effect
            elements.loadingSection.classList.add('hidden');
            elements.resultSection.classList.remove('hidden');
            
            // Restore frame background for result
            document.body.classList.add('bg-frame');
            
            // Hide distracting elements
            document.querySelector('.usage-counter').style.display = 'none';
            document.querySelector('.fortune-popup').style.display = 'none';
            document.querySelector('.footer').style.display = 'none';
            
            // Disable background animations for performance
            document.body.classList.add('showing-result');
            
            // Play result reveal sound after a short delay
            setTimeout(() => {
                playSound('resultReveal'); // Special sound for showing result
            }, 500);
            
            stopBackgroundMusic(); // Stop fortune music
            
            // Start homepage music after showing result
            setTimeout(() => {
                startHomepageMusic();
            }, 3000);
            
            // Stop camera after successful fortune reading
            stopCamera();
            autoMode = false;
            hasShownResult = true;
            
            // Add special fortune teller animation
            addFortuneTellerMagic();
            
            // Fortune teller reveals the fortune briefly, then stays quiet
            const fortuneMessages = [
                "Tuyệt vời! Vận mệnh của bạn đã được tiết lộ! ✨",
                "Đây là những gì tôi thấy trong lòng bàn tay của bạn... 🔮",
                "Vận mệnh của bạn thật thú vị! 🌟",
                "Tôi đã nhìn thấy tương lai của bạn rồi! 🎭"
            ];
            const randomMessage = fortuneMessages[Math.floor(Math.random() * fortuneMessages.length)];
            
            // After showing result, keep quiet
            setTimeout(() => {
            }, 3000);
            
            // Display fortune sections
            displayFortuneSections(data.fortune);
        } else {
            throw new Error(data.message || 'Fortune telling failed');
        }

    } catch (error) {
        playSound('error'); // Play error sound
        stopBackgroundMusic(); // Stop fortune music on error
        
        // Hide loading
        elements.loadingSection.classList.add('hidden');
        document.querySelector('.upload-section').classList.remove('hidden');
        
        // Remove frame background for Scanning/Camera mode
        document.body.classList.remove('bg-frame');
        
        // Start homepage music after error
        setTimeout(() => {
            startHomepageMusic();
        }, 2000);
        
        if (String(error && error.message) === 'MODEL_OVERLOADED') {
            alert('Dịch vụ AI đang quá tải. Vui lòng thử lại sau ít phút.');
        } else {
            // Fortune teller apologizes
            alert(messages.fortuneError);
        }
    } finally {
        if (!hasShownResult) {
            isProcessing = false;
        }
    }
}

// ================================
// DISPLAY FORTUNE SECTIONS
// ================================
function displayFortuneSections(fortuneData) {
    // Display single fortune text
    if (fortuneData.fortune) {
        const fortuneText = document.getElementById('fortuneText');
        if (fortuneText) {
            // Hide initially
            fortuneText.style.opacity = '0';
            fortuneText.style.transform = 'translateY(20px)';
            
            // Show with animation
            setTimeout(() => {
                fortuneText.style.transition = 'all 0.8s ease-out';
                fortuneText.style.opacity = '1';
                fortuneText.style.transform = 'translateY(0)';
                
                // Display HTML content with line breaks
                // Clean up text to avoid large gaps (user request: "chỉ xuống dòng, không cách đoạn")
                let cleanText = fortuneData.fortune;
                if (cleanText) {
                    // Remove JSON artifacts if present
                    if (typeof cleanText === 'string') {
                        // Remove "fortune": prefix if present
                        cleanText = cleanText.replace(/"?fortune"?\s*:\s*/i, '');
                        // Remove opening/closing braces if it looks like a JSON object wrapper
                        if (cleanText.trim().startsWith('{') && cleanText.trim().endsWith('}')) {
                            cleanText = cleanText.replace(/^[\s{]+|[\s}]+$/g, '');
                        }
                        // Remove wrapping quotes if present
                        if (cleanText.trim().startsWith('"') && cleanText.trim().endsWith('"')) {
                            cleanText = cleanText.trim().slice(1, -1);
                        }
                    }

                    // Convert markdown bold to highlight HTML if model forgot HTML tags or used markdown
                    cleanText = cleanText.replace(/\*\*(.*?)\*\*/g, '<b class="highlight">$1</b>');

                    // Replace multiple <br> with single <br>
                    cleanText = cleanText.replace(/(<br\s*\/?>\s*){2,}/gi, '<br>');
                    // Replace paragraph tags with single line break
                    cleanText = cleanText.replace(/<\/p>\s*<p>/gi, '<br>');
                    cleanText = cleanText.replace(/<\/?p>/gi, ''); // Remove remaining p tags
                    // Replace multiple newlines
                    cleanText = cleanText.replace(/\n{2,}/g, '<br>');
                }
                fortuneText.innerHTML = cleanText;
                }, 500);
        } else {
            }
    } else {
        // Fallback: try to display any available text
        const fortuneText = document.getElementById('fortuneText');
        if (fortuneText) {
            const fallbackText = "Xin lỗi, không thể tạo lời bói lúc này. Vui lòng thử lại sau! 🔮";
            fortuneText.textContent = fallbackText;
            fortuneText.style.opacity = '1';
            fortuneText.style.transform = 'translateY(0)';
        }
    }
}

// ================================
// TYPEWRITER EFFECT
// ================================
function typeWriter(text, element, speed = 20) {
    element.textContent = '';
    let i = 0;
    
    function type() {
        if (i < text.length) {
            element.textContent += text.charAt(i);
            i++;
            setTimeout(type, speed);
        }
    }
    
    type();
}

// ================================
// FORTUNE TELLER SPEECH
// ================================


// ================================
// FORTUNE TELLER MAGIC EFFECTS
// ================================
function addFortuneTellerMagic() {
    const fortuneTeller = document.querySelector('.fortune-teller-avatar');
    if (!fortuneTeller) return;
    
    // Add magical sparkle effect
    createSparkles();
    
    // Add special glow animation
    fortuneTeller.style.animation = 'float 1s ease-in-out infinite, glow 0.5s ease-in-out infinite alternate';
    
    // Reset after 3 seconds
    setTimeout(() => {
        fortuneTeller.style.animation = 'float 3s ease-in-out infinite';
    }, 3000);
}

function createSparkles() {
    const container = document.querySelector('.fortune-teller');
    if (!container) return;
    
    for (let i = 0; i < 8; i++) {
        const sparkle = document.createElement('div');
        sparkle.innerHTML = '✨';
        sparkle.style.position = 'absolute';
        sparkle.style.fontSize = '1.5rem';
        sparkle.style.pointerEvents = 'none';
        sparkle.style.zIndex = '1000';
        
        // Random position around fortune teller
        const angle = (i / 8) * 2 * Math.PI;
        const radius = 80;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        
        sparkle.style.left = `calc(50% + ${x}px)`;
        sparkle.style.top = `calc(50% + ${y}px)`;
        sparkle.style.transform = 'translate(-50%, -50%)';
        sparkle.style.animation = 'sparkleFloat 2s ease-out forwards';
        
        container.appendChild(sparkle);
        
        // Remove sparkle after animation
        setTimeout(() => {
            if (sparkle.parentNode) {
                sparkle.parentNode.removeChild(sparkle);
            }
        }, 2000);
    }
}

// ================================
// CAMERA HANDLING
// ================================
async function getAvailableCameras() {
    try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoInputs = devices.filter(d => d.kind === 'videoinput');
        availableCameras = videoInputs;
        return videoInputs;
    } catch (e) {
        return [];
    }
}

async function getPreferredBackCameraDeviceId() {
    try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoInputs = devices.filter(d => d.kind === 'videoinput');
        // Prefer labels that look like back/environment
        const backLike = videoInputs.find(d => /back|environment|rear/i.test(d.label));
        return (backLike || videoInputs[0])?.deviceId || null;
    } catch (e) {
        return null;
    }
}

async function startCamera() {
    // Remove frame background for Scanning/Camera mode
    document.body.classList.remove('bg-frame');

    // Check if we're in the right section
    const uploadSection = document.getElementById('uploadSection');
    if (!uploadSection || uploadSection.classList.contains('hidden')) {
        return;
    }
    
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        elements.cameraStatus.innerHTML = `
            <p style="color: #e74c3c;">❌ Trình duyệt không hỗ trợ camera</p>
            <p style="font-size: 0.9rem; margin-top: 0.5rem;">Vui lòng sử dụng trình duyệt hiện đại hơn (Chrome, Safari, Firefox)</p>
        `;
        return;
    }

    try {
        elements.cameraStatus.innerHTML = '<p>🔮 Đang yêu cầu quyền truy cập camera...</p>';
        
        // Simple, mobile-friendly constraints - start minimal
        const simpleConstraints = {
            audio: false,
            video: {
                facingMode: 'environment',  // Back camera on mobile
                width: { ideal: 640 },
                height: { ideal: 480 }
            }
        };
        
        // Try multiple camera strategies silently
        let cameraSuccess = false;
        
        // Strategy 1: Simple back camera with retry and timeout
        for (let retry = 0; retry < 3 && !cameraSuccess; retry++) {
            try {
                if (retry > 0) {
                    elements.cameraStatus.innerHTML = `<p>🔄 Thử lại camera lần ${retry + 1}...</p>`;
                    await new Promise(resolve => setTimeout(resolve, 500 * retry)); // Progressive delay
                } else {
                    elements.cameraStatus.innerHTML = '<p>📷 Đang thử camera sau...</p>';
                }
                
                // Try with timeout to avoid hanging
                const cameraPromise = navigator.mediaDevices.getUserMedia(simpleConstraints);
                const timeoutPromise = new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Camera timeout')), 5000)
                );
                
                cameraStream = await Promise.race([cameraPromise, timeoutPromise]);
                elements.cameraStatus.innerHTML = '<p style="color: #27ae60;">✅ Camera sau hoạt động!</p>';
                cameraSuccess = true;
            } catch (e) {
                elements.cameraStatus.innerHTML = `<p style="color: #e67e22;">⚠️ Camera sau thất bại lần ${retry + 1}: ${e.name}</p>`;
            }
        }
        
        // Strategy 2: Front camera if back failed
        if (!cameraSuccess) {
            try {
                elements.cameraStatus.innerHTML = '<p>📱 Đang thử camera trước...</p>';
                cameraStream = await navigator.mediaDevices.getUserMedia({
                    audio: false,
                    video: { facingMode: 'user' }
                });
                elements.cameraStatus.innerHTML = '<p style="color: #27ae60;">✅ Camera trước hoạt động!</p>';
                cameraSuccess = true;
            } catch (e) {
                elements.cameraStatus.innerHTML = `<p style="color: #e67e22;">⚠️ Camera trước thất bại: ${e.name}</p>`;
            }
        }
        
        // Strategy 3: Any camera with minimal constraints
        if (!cameraSuccess) {
            try {
                elements.cameraStatus.innerHTML = '<p>🔧 Đang thử camera với cài đặt tối thiểu...</p>';
                cameraStream = await navigator.mediaDevices.getUserMedia({
                    audio: false,
                    video: { width: 320, height: 240 }
                });
                elements.cameraStatus.innerHTML = '<p style="color: #27ae60;">✅ Camera tối thiểu hoạt động!</p>';
                cameraSuccess = true;
            } catch (e) {
                elements.cameraStatus.innerHTML = `<p style="color: #e67e22;">⚠️ Camera tối thiểu thất bại: ${e.name}</p>`;
            }
        }
        
        // Strategy 4: Last resort - any video
        if (!cameraSuccess) {
            try {
                elements.cameraStatus.innerHTML = '<p>🎯 Thử camera cuối cùng...</p>';
                cameraStream = await navigator.mediaDevices.getUserMedia({
                    audio: false,
                    video: true
                });
                elements.cameraStatus.innerHTML = '<p style="color: #27ae60;">✅ Camera cuối cùng hoạt động!</p>';
                cameraSuccess = true;
            } catch (e) {
                elements.cameraStatus.innerHTML = `<p style="color: #e74c3c;">❌ Tất cả camera thất bại: ${e.name}</p>`;
            }
        }
        
        // If no camera works, show helpful message but don't crash
        if (!cameraSuccess) {
            // Different message for mobile vs desktop
            if (isMobile()) {
                elements.cameraStatus.innerHTML = `
                    <p style="color: #e74c3c; font-weight: bold; margin-bottom: 1rem;">⚠️ CAMERA KHÔNG KHẢ DỤNG</p>
                    <p style="font-size: 0.9rem; margin-bottom: 1.5rem; line-height: 1.5;">
                        Camera đang được sử dụng bởi ứng dụng khác hoặc bị chặn.
                    </p>
                    <div style="margin-bottom: 1rem;">
                        <button class="action-btn primary" onclick="showMobileUploadInterface()" style="width: 100%; padding: 1rem; margin-bottom: 0.5rem;">
                            📷 Chuyển sang chế độ upload
                        </button>
                        <button class="action-btn secondary" onclick="window.location.reload()" style="width: 100%; padding: 0.8rem; font-size: 0.9rem;">
                            🔄 Làm mới trang
                        </button>
                    </div>
                `;
            } else {
                elements.cameraStatus.innerHTML = `
                    <p style="color: #e74c3c; font-weight: bold;">⚠️ CAMERA KHÔNG KHẢ DỤNG</p>
                    <p style="font-size: 0.9rem; margin: 1rem 0; line-height: 1.6;">
                        Camera đang được sử dụng bởi ứng dụng khác hoặc bị chặn.<br><br>
                        <strong>Hãy thử:</strong><br>
                        1️⃣ Đóng tất cả ứng dụng camera khác<br>
                        2️⃣ Làm mới trang này<br>
                        3️⃣ Kiểm tra quyền camera trong cài đặt trình duyệt
                    </p>
                    <button class="action-btn primary" onclick="window.location.reload()" style="margin-top: 1rem;">
                        🔄 Làm mới trang
                    </button>
                `;
            }
            return; // Exit gracefully without throwing
        }
        
        elements.cameraVideo.srcObject = cameraStream;
        // Help autoplay on mobile
        try { elements.cameraVideo.setAttribute('muted', ''); elements.cameraVideo.muted = true; } catch(_) {}
        
        // Ensure playback starts (important on re-initialization)
        try {
            await elements.cameraVideo.play();
            elements.cameraStatus.innerHTML = '<p style="color: #27ae60;">✅ Camera đang chạy! Đang khởi tạo quét bàn tay...</p>';
        } catch (e) {
            elements.cameraStatus.innerHTML = '<p style="color: #e67e22;">⚠️ Camera chạy nhưng video chưa phát</p>';
        }
        
        // Wait a bit then show final message
        setTimeout(() => {
            if (isMobile()) {
                elements.cameraStatus.innerHTML = `
                    <p style="margin-bottom: 1rem;">🔮 Đưa lòng bàn tay rõ ràng vào khung để tự động quét và bói</p>
                    <button class="action-btn secondary" onclick="showMobileUploadInterface()" style="width: 100%; padding: 0.8rem 1rem; font-size: 0.9rem; margin-top: 0.5rem;">
                        📷 Hoặc chụp ảnh thủ công
                    </button>
                `;
            } else {
                elements.cameraStatus.innerHTML = '<p>🔮 Đưa lòng bàn tay rõ ràng vào khung để tự động quét và bói</p>';
            }
        }, 2000);
        
        // Initialize MediaPipe hands only after video metadata is ready
        const initHands = () => {
            elements.cameraStatus.innerHTML = '<p style="color: #3498db;">🔧 Đang khởi tạo quét bàn tay...</p>';
            initializeHandDetection();
            elements.autoCaptureIndicator.classList.add('active');
            
            // Show success message after MediaPipe is ready
            setTimeout(() => {
                elements.cameraStatus.innerHTML = '<p style="color: #27ae60;">✅ Sẵn sàng quét bàn tay! Đưa lòng bàn tay vào khung</p>';
            }, 1000);
        };
        if (elements.cameraVideo.readyState >= 2 && elements.cameraVideo.videoWidth > 0) {
            initHands();
        } else {
            elements.cameraVideo.addEventListener('loadedmetadata', initHands, { once: true });
        }
        
        // Fortune teller welcomes user
        
    } catch (e) {
        // Error messages for different error types
        if (e.name === 'NotAllowedError') {
            elements.cameraStatus.innerHTML = `
                <p style="color: #e74c3c; font-weight: bold;">❌ QUYỀN CAMERA BỊ TỪ CHỐI</p>
                <p style="font-size: 0.9rem; margin: 1rem 0; line-height: 1.6;">
                    Bạn cần cho phép truy cập camera để sử dụng tính năng này.<br><br>
                    <strong>Hãy làm theo:</strong><br>
                    1️⃣ Nhấn vào biểu tượng camera trên thanh địa chỉ<br>
                    2️⃣ Chọn "Cho phép" camera<br>
                    3️⃣ Làm mới trang
                </p>
                <button class="action-btn primary" onclick="window.location.reload()" style="margin-top: 1rem;">
                    🔄 Làm mới trang
                </button>
            `;
        } else if (e.name !== 'NotReadableError') {
            // Other errors (NotFoundError, OverconstrainedError, etc.)
            elements.cameraStatus.innerHTML = `
                <p style="color: #e74c3c;">❌ Lỗi camera: ${e.message || e.name}</p>
                <button class="action-btn primary" onclick="window.location.reload()" style="margin-top: 1rem;">
                    🔄 Thử lại
                </button>
            `;
        }
        // NotReadableError already handled above with detailed instructions
    }
}

function stopCamera() {
    // Stop camera stream
    if (cameraStream) {
        cameraStream.getTracks().forEach(t => t.stop());
        cameraStream = null;
    }
    
    // Stop MediaPipe camera
    if (mpCamera && typeof mpCamera.stop === 'function') {
        try {
            mpCamera.stop();
        } catch (e) {
            }
        mpCamera = null;
    }
    
    // Close MediaPipe hands
    if (hands) {
        try {
            hands.close();
        } catch (e) {
            }
        hands = null;
    }
    
    // Clear timers
    if (handTimerId) {
        clearTimeout(handTimerId);
        handTimerId = null;
    }
    
    // Reset UI indicators
    elements.handDetectionBox.classList.remove('active');
    elements.autoCaptureIndicator.classList.remove('active');
    
    // Clear video source
    if (elements.cameraVideo) {
        elements.cameraVideo.srcObject = null;
    }
    
    }

function closeCamera() {
    stopCamera();
    
    // Hide camera section, show upload area
    elements.cameraSection.classList.add('hidden');
    elements.uploadArea.classList.remove('hidden');
    
    // FORCE: Always show QR message
    if (elements.fortuneTellerText) {
        elements.fortuneTellerText.textContent = "Bấm vào để mở rộng QR 🔮";
        elements.fortuneTellerText.style.cursor = 'pointer';
        elements.fortuneTellerText.onclick = function() {
            if (typeof showQRPopup === 'function') {
                showQRPopup();
            }
        };
    }
}

function showMobileUploadInterface() {
    // Remove frame background for Scanning/Camera mode
    document.body.classList.remove('bg-frame');

    // Replace entire camera section with mobile upload interface
    const mobileUploadHTML = `
        <div class="mobile-upload-container">
            <div class="upload-icon-large">🖐️</div>
            <h3 style="color: #9b59b6; margin: 1rem 0;">Chụp ảnh lòng bàn tay</h3>
            <p style="margin-bottom: 1.5rem; line-height: 1.5; color: #bdc3c7; font-size: 0.95rem;">
                Chụp ảnh lòng bàn tay rõ ràng hoặc chọn từ thư viện
            </p>
            
            <div style="margin-bottom: 1.5rem;">
                <button class="action-btn primary large" id="mobileCameraBtn">
                    📷 Chụp ảnh mới
                </button>
                
                <button class="action-btn secondary large" id="mobileGalleryBtn">
                    🖼️ Chọn từ thư viện
                </button>
            </div>
            
            <div style="padding: 0.8rem; background: rgba(155, 89, 182, 0.08); border-radius: 8px; border: 1px solid rgba(155, 89, 182, 0.2);">
                <p style="font-size: 0.85rem; color: #9b59b6; margin: 0; line-height: 1.4;">
                    💡 <strong>Mẹo:</strong> Chụp với ánh sáng tốt, đặt tay phẳng và rõ ràng
                </p>
            </div>
        </div>
    `;
    
    // Replace entire camera section content
    elements.cameraSection.innerHTML = mobileUploadHTML;
    
    // Hide fortune button on mobile (not needed with auto-trigger)
    if (elements.fortuneBtn) {
        elements.fortuneBtn.style.display = 'none';
    }
    
    // Add event listeners for mobile buttons
    const mobileCameraBtn = document.getElementById('mobileCameraBtn');
    const mobileGalleryBtn = document.getElementById('mobileGalleryBtn');
    
    if (mobileCameraBtn) {
        mobileCameraBtn.addEventListener('click', () => {
            // Create file input for camera
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.capture = 'environment'; // Use back camera
            input.onchange = (e) => {
                const file = e.target.files[0];
                if (file) {
                    handleFileSelect(file);
                    // Auto trigger fortune after file is ready
                    setTimeout(() => {
                        getFortune();
                    }, 100);
                }
            };
            input.click();
        });
    }
    
    if (mobileGalleryBtn) {
        mobileGalleryBtn.addEventListener('click', () => {
            // Create file input for gallery
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.onchange = (e) => {
                const file = e.target.files[0];
                if (file) {
                    handleFileSelect(file);
                    // Auto trigger fortune after file is ready
                    setTimeout(() => {
                        getFortune();
                    }, 100);
                }
            };
            input.click();
        });
    }
    
    // Update fortune teller message
    // FORCE: Always show QR message
    if (elements.fortuneTellerText) {
        elements.fortuneTellerText.textContent = "Bấm vào để mở rộng QR 🔮";
        elements.fortuneTellerText.style.cursor = 'pointer';
        elements.fortuneTellerText.onclick = function() {
            if (typeof showQRPopup === 'function') {
                showQRPopup();
            }
        };
    }
}

async function switchCamera() {
    if (availableCameras.length <= 1) {
        alert('Chỉ có 1 camera khả dụng');
        return;
    }
    
    // Cycle through cameras
    currentCameraIndex = (currentCameraIndex + 1) % availableCameras.length;
    const selectedCamera = availableCameras[currentCameraIndex];
    
    // Stop current camera
    stopCamera();
    
    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Start with selected camera
    try {
        const constraints = {
            audio: false,
            video: {
                deviceId: { exact: selectedCamera.deviceId },
                width: { ideal: 640, max: 1280 },
                height: { ideal: 480, max: 720 },
                frameRate: { ideal: 30, max: 60 }
            }
        };
        
        cameraStream = await navigator.mediaDevices.getUserMedia(constraints);
        elements.cameraVideo.srcObject = cameraStream;
        
        // Help autoplay on mobile
        try { elements.cameraVideo.setAttribute('muted', ''); elements.cameraVideo.muted = true; } catch(_) {}
        
        await elements.cameraVideo.play();
        
        
    } catch (e) {
        alert('Không thể chuyển camera. Thử lại nhé!');
        // Fallback to normal start
        startCamera();
    }
}

function captureFrameToFile() {
    const video = elements.cameraVideo;
    const canvas = elements.captureCanvas;
    const width = video.videoWidth;
    const height = video.videoHeight;
    
    if (!width || !height) {
        return;
    }

    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, width, height);

    canvas.toBlob((blob) => {
        if (!blob) {
            return;
        }
        const file = new File([blob], `camera-palm-${Date.now()}.png`, { type: 'image/png' });
        handleFileSelect(file);
        // Auto trigger fortune after file is ready
        setTimeout(() => {
            getFortune();
        }, 100);
    }, 'image/png', 0.95);
}

function initializeHandDetection() {
    // If MediaPipe has failed before, use fallback mode
    if (mediaPipeFailed) {
        // Don't auto capture immediately, wait for user to put hand in frame
        // Show instruction and wait for manual trigger
        elements.cameraStatus.innerHTML = '<p>🔮 Đưa lòng bàn tay vào khung và bấm nút bên dưới để bói</p>';
        
        // Create manual capture button for fallback mode
        const fallbackBtn = document.createElement('button');
        fallbackBtn.id = 'fallbackCaptureBtn';
        fallbackBtn.className = 'action-btn primary';
        fallbackBtn.style.marginTop = '1rem';
        fallbackBtn.textContent = '📸 Chụp ảnh bàn tay';
        fallbackBtn.addEventListener('click', () => {
            if (!isProcessing) {
                autoCapture();
            }
        });
        elements.cameraStatus.appendChild(fallbackBtn);
        
        // Update fortune teller speech
        return;
    }
    
    // Clean up existing instances completely
    if (hands) {
        try {
            hands.close();
        } catch (e) {
            }
        hands = null;
    }
    
    if (mpCamera) {
        try {
            mpCamera.stop();
        } catch (e) {
            }
        mpCamera = null;
    }
    
    // Wait a bit before creating new instances
    setTimeout(() => {
        try {
            createMediaPipeInstances();
        } catch (error) {
            mediaPipeFailed = true;
            switchToFallbackMode();
        }
    }, 200);
}

// Separate function to create MediaPipe instances
function createMediaPipeInstances() {
    try {
        // Check if MediaPipe is available
        if (typeof Hands === 'undefined') {
            mediaPipeFailed = true;
            switchToFallbackMode();
            return;
        }
        
        hands = new Hands({
            locateFile: (file) => {
                return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
            }
        });
        
        hands.setOptions({
            maxNumHands: 1,
            modelComplexity: 1,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5
        });
        
        // Add error handling for hands results
        hands.onResults = (results) => {
            try {
                onHandResults(results);
            } catch (error) {
                }
        };
        
        mpCamera = new Camera(elements.cameraVideo, {
            onFrame: async () => {
                if (hands && !mediaPipeFailed) {
                    try {
                        await hands.send({ image: elements.cameraVideo });
                    } catch (error) {
                        if (error.message.includes('Aborted') || error.message.includes('Module.arguments') || error.message.includes('Could not establish connection')) {
                            mediaPipeFailed = true;
                            switchToFallbackMode();
                        }
                    }
                }
            },
            width: 640,
            height: 480
        });
        
        } catch (error) {
        mediaPipeFailed = true;
        switchToFallbackMode();
    }
    
    if (typeof Hands === 'undefined') {
        mediaPipeFailed = true;
        // Fallback: show manual capture button
        elements.cameraStatus.innerHTML = '<p style="color: #e67e22;">⚠️ MediaPipe không tải được. Dùng chế độ thủ công.</p>';
        
        const fallbackBtn = document.createElement('button');
        fallbackBtn.id = 'fallbackCaptureBtn';
        fallbackBtn.className = 'action-btn primary';
        fallbackBtn.style.marginTop = '1rem';
        fallbackBtn.textContent = '📸 Chụp ảnh bàn tay';
        fallbackBtn.addEventListener('click', () => {
            if (!isProcessing) {
                autoCapture();
            }
        });
        elements.cameraStatus.appendChild(fallbackBtn);
        
        return;
    }

    // Create completely new instance with fresh configuration
    try {
        hands = new Hands({
            locateFile: (file) => {
                return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
            }
        });

        hands.setOptions({
            maxNumHands: 1,
            modelComplexity: 1,
            minDetectionConfidence: 0.3,
            minTrackingConfidence: 0.3
        });

        hands.onResults(onHandResults);
        
        // Start processing video frames with fresh camera instance
        mpCamera = new Camera(elements.cameraVideo, {
            onFrame: async () => {
                if (hands && !isProcessing && !hasShownResult) {
                    try {
                        await hands.send({ image: elements.cameraVideo });
                    } catch (e) {
                        mediaPipeFailed = true;
                        // Stop MediaPipe and use fallback
                        if (mpCamera) {
                            try {
                                mpCamera.stop();
                            } catch (e2) {
                                }
                            mpCamera = null;
                        }
                        if (hands) {
                            try {
                                hands.close();
                            } catch (e2) {
                                }
                            hands = null;
                        }
                        // Use fallback - show manual capture button
                        elements.cameraStatus.innerHTML = '<p>🔮 Đưa lòng bàn tay vào khung và bấm nút bên dưới để bói</p>';
                        
                        const fallbackBtn = document.createElement('button');
                        fallbackBtn.id = 'fallbackCaptureBtn';
                        fallbackBtn.className = 'action-btn primary';
                        fallbackBtn.style.marginTop = '1rem';
                        fallbackBtn.textContent = '📸 Chụp ảnh bàn tay';
                        fallbackBtn.addEventListener('click', () => {
                            if (!isProcessing) {
                                autoCapture();
                            }
                        });
                        elements.cameraStatus.appendChild(fallbackBtn);
                        
                    }
                }
            },
            width: 640,
            height: 480
        });
        mpCamera.start();
        
        } catch (e) {
        mediaPipeFailed = true;
        // Fallback: show manual capture button
        elements.cameraStatus.innerHTML = `<p style="color: #e74c3c;">❌ MediaPipe lỗi: ${e.message || e.name}. Dùng chế độ thủ công.</p>`;
        
        const fallbackBtn = document.createElement('button');
        fallbackBtn.id = 'fallbackCaptureBtn';
        fallbackBtn.className = 'action-btn primary';
        fallbackBtn.style.marginTop = '1rem';
        fallbackBtn.textContent = '📸 Chụp ảnh bàn tay';
        fallbackBtn.addEventListener('click', () => {
            if (!isProcessing) {
                autoCapture();
            }
        });
        elements.cameraStatus.appendChild(fallbackBtn);
        
    }
}

function onHandResults(results) {
    if (!autoMode || isProcessing || hasShownResult) return; // Don't process if already processing

    const video = elements.cameraVideo;
    const videoWidth = video.videoWidth;
    const videoHeight = video.videoHeight;
    
    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        const hand = results.multiHandLandmarks[0];
        
        // Check if it's a proper palm (not just fingers)
        const isProperPalm = checkPalmQuality(hand);
        
        if (!isProperPalm) {
            elements.handDetectionBox.classList.remove('active');
            elements.autoCaptureIndicator.classList.remove('active');
            handDetected = false;
            
            // Fortune teller gives guidance (only occasionally)
            if (Math.random() < 0.3) { // Only 30% chance to speak
            }
            return;
        }
        
        // Fortune teller acknowledges good palm (only once)
        if (!handDetected) {
            playSound('handDetected'); // Play mystical chime when hand is first detected
            playSound('mysticalSparkle'); // Add magical sparkle effect
        }
        
        // Calculate vertical palm-focused box
        const palmCenter = hand[9]; // Palm center landmark
        const wrist = hand[0]; // Wrist landmark
        
        // Get finger tip positions
        const fingerTips = [4, 8, 12, 16, 20]; // Finger tip landmarks
        
        // Create a smaller horizontal box, just enough for palm
        // Smaller width, taller height for palm detection
        let boxWidth = 0.25; // Default for Desktop
        let boxHeight = 0.4; // Default for Desktop
        
        // Mobile adjustments
        if (isMobile()) {
            boxWidth = 0.5; // Wider for mobile (increased from 0.35)
            boxHeight = 0.6; // Taller for mobile (increased from 0.5)
        }

        const halfWidth = boxWidth / 2;
        const halfHeight = boxHeight / 2;
        
        // Auto-detect hand and adjust offset for perfect centering
        // Check if it's left hand (thumb on left) or right hand (thumb on right)
        const thumbTip = hand[4];
        const indexTip = hand[8];
        const isLeftHand = thumbTip.x < indexTip.x; // Left hand: thumb is to the left of index
        
        // Adjust offset: Left hand needs more left shift, Right hand needs less
        let offsetX = isLeftHand ? -0.15 : -0.055; // Default Desktop
        let offsetY = 0; // Vertical offset
        
        if (isMobile()) {
            // On mobile, the large negative offset causes misalignment (box too far left).
            // Reducing the offset to align better with the visual hand position.
            // Increased offset to shift box more to the right
            offsetX = isLeftHand ? 0.05 : 0.08; 
            
            // Shift down slightly
            offsetY = 0.05;
        }
        
        const centerX = palmCenter.x + offsetX;
        const centerY = palmCenter.y + offsetY;
        
        // Calculate final positions with different width/height
        const finalMinX = Math.max(0, centerX - halfWidth);
        const finalMaxX = Math.min(1, centerX + halfWidth);
        const finalMinY = Math.max(0, centerY - halfHeight);
        const finalMaxY = Math.min(1, centerY + halfHeight);
        
        if (isMobile()) {
            // Update detection box using percentages for Mobile (better for responsive/scaled video)
            elements.handDetectionBox.style.left = (finalMinX * 100) + '%';
            elements.handDetectionBox.style.top = (finalMinY * 100) + '%';
            elements.handDetectionBox.style.width = ((finalMaxX - finalMinX) * 100) + '%';
            elements.handDetectionBox.style.height = ((finalMaxY - finalMinY) * 100) + '%';
        } else {
            // Convert to pixel coordinates for Desktop (Original Behavior)
            const boxX = finalMinX * videoWidth;
            const boxY = finalMinY * videoHeight;
            const pixelBoxWidth = (finalMaxX - finalMinX) * videoWidth;
            const pixelBoxHeight = (finalMaxY - finalMinY) * videoHeight;
            
            elements.handDetectionBox.style.left = boxX + 'px';
            elements.handDetectionBox.style.top = boxY + 'px';
            elements.handDetectionBox.style.width = pixelBoxWidth + 'px';
            elements.handDetectionBox.style.height = pixelBoxHeight + 'px';
        }
        
        elements.handDetectionBox.classList.add('active');
        
        // Show auto capture indicator
        elements.autoCaptureIndicator.classList.add('active');
        
        // Auto capture if palm is stable for 3 seconds (longer for better quality)
        if (!handDetected) {
            handDetected = true;
            
            // Fortune teller starts countdown
            
            if (handTimerId) clearTimeout(handTimerId);
            handTimerId = setTimeout(() => {
                if (handDetected && autoMode && !isProcessing && !hasShownResult) {
                    autoCapture();
                }
            }, 3000);
        }
    } else {
        // No hand detected
        if (handDetected) {
            }
        elements.handDetectionBox.classList.remove('active');
        elements.autoCaptureIndicator.classList.remove('active');
        handDetected = false;
    }
}

// Check if the detected hand is a proper palm suitable for fortune telling
function checkPalmQuality(hand) {
    // MediaPipe hand landmarks indices:
    // 0: wrist, 4: thumb tip, 8: index tip, 12: middle tip, 16: ring tip, 20: pinky tip
    // 5: thumb IP, 9: index PIP, 13: middle PIP, 17: ring PIP, 21: pinky PIP
    
    const wrist = hand[0];
    const thumbTip = hand[4];
    const indexTip = hand[8];
    const middleTip = hand[12];
    const ringTip = hand[16];
    const pinkyTip = hand[20];
    
    // How spread out the fingers are (all adjacent gaps)
    const splayScore = calculateSplayScore(hand);
    // Thumb-index gap to ensure an open palm (not a fist)
    const thumbIndexGap = calculateThumbIndexGap(hand);
    
    // Check if hand is large enough (not too far)
    const handSize = calculateHandSize(hand);
    
    // Check if palm area is visible (wrist to middle of fingers)
    const palmVisibility = calculatePalmVisibility(hand);
    
    // Criteria for good palm:
    // 1. Splay score > 0.22 (adjacent fingertips sufficiently apart)
    // 2. Thumb-index gap > 0.08
    // 3. Hand size > 0.15 (not too far from camera)
    // 4. Palm visibility > 0.4 (palm area is clearly visible)
    return splayScore > 0.22 && thumbIndexGap > 0.08 && handSize > 0.15 && palmVisibility > 0.4;
}

function calculateSplayScore(hand) {
    // Adjacent fingertip distances normalized by hand width
    const wrist = hand[0];
    const tips = [hand[4], hand[8], hand[12], hand[16], hand[20]]; // thumb -> pinky
    const centerX = (tips[1].x + tips[4].x) / 2; // between index and pinky
    const centerY = (tips[1].y + tips[4].y) / 2;
    const handWidth = Math.sqrt(Math.pow(centerX - wrist.x, 2) + Math.pow(centerY - wrist.y, 2));
    let sum = 0;
    let count = 0;
    for (let i = 0; i < tips.length - 1; i++) {
        const a = tips[i];
        const b = tips[i + 1];
        const d = Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));
        sum += d;
        count++;
    }
    const avgGap = sum / Math.max(1, count);
    return avgGap / (handWidth + 0.1);
}

function calculateThumbIndexGap(hand) {
    const thumbTip = hand[4];
    const indexTip = hand[8];
    const wrist = hand[0];
    const gap = Math.sqrt(Math.pow(thumbTip.x - indexTip.x, 2) + Math.pow(thumbTip.y - indexTip.y, 2));
    const ref = Math.sqrt(Math.pow(indexTip.x - wrist.x, 2) + Math.pow(indexTip.y - wrist.y, 2));
    return gap / (ref + 0.1);
}

function calculateHandSize(hand) {
    // Calculate overall hand size
    const xCoords = hand.map(point => point.x);
    const yCoords = hand.map(point => point.y);
    const minX = Math.min(...xCoords);
    const maxX = Math.max(...xCoords);
    const minY = Math.min(...yCoords);
    const maxY = Math.max(...yCoords);
    
    const width = maxX - minX;
    const height = maxY - minY;
    
    return Math.sqrt(width * width + height * height);
}

function calculatePalmVisibility(hand) {
    // Check if palm area (center of hand) is well positioned
    const wrist = hand[0];
    const middleBase = hand[9]; // Index finger base
    const ringBase = hand[13]; // Middle finger base
    
    // Calculate palm center
    const palmCenterX = (wrist.x + middleBase.x + ringBase.x) / 3;
    const palmCenterY = (wrist.y + middleBase.y + ringBase.y) / 3;
    
    // Check if palm center is in a good position (not too close to edges)
    const centerDistance = Math.sqrt(
        Math.pow(palmCenterX - 0.5, 2) + 
        Math.pow(palmCenterY - 0.5, 2)
    );
    
    // Good palm visibility if center is not too far from screen center
    return 1 - centerDistance; // Closer to center = higher score
}

function autoCapture() {
    const now = Date.now();
    if (isProcessing) {
        return; // Already processing a capture
    }
    if (hasShownResult) {
        return;
    }
    if (now - lastCaptureTime < 5000) {
        return; // Prevent too frequent captures
    }
    
    lastCaptureTime = now;
    
    // Fortune teller captures
    // FORCE: Always show QR message
    if (elements.fortuneTellerText) {
        elements.fortuneTellerText.textContent = "Bấm vào để mở rộng QR 🔮";
        elements.fortuneTellerText.style.cursor = 'pointer';
        elements.fortuneTellerText.onclick = function() {
            if (typeof showQRPopup === 'function') {
                showQRPopup();
            }
        };
    }
    
    captureFrameToFile();
    
    // Show capture feedback
    elements.cameraStatus.innerHTML = '<p>🔮 Đang quét bàn tay...</p>';
    setTimeout(() => {
        elements.cameraStatus.innerHTML = '<p>🔮 Đưa lòng bàn tay rõ ràng vào khung để tự động quét và bói</p>';
    }, 3000);
}

// ================================
// SHARE FUNCTIONALITY
// ================================
async function shareFortune() {
    // Collect all fortune content from sections
    const sections = ['introContent', 'palmLinesContent', 'loveContent', 'careerContent', 'healthContent', 'adviceContent'];
    const fortuneText = sections.map(id => {
        const element = document.getElementById(id);
        return element ? element.textContent : '';
    }).filter(text => text.trim()).join('\n\n');
    
    try {
        if (navigator.clipboard) {
            await navigator.clipboard.writeText(fortuneText);
            alert(messages.shareSuccess);
        } else {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = fortuneText;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            alert(messages.shareSuccess);
        }
    } catch (error) {
        alert(messages.shareError);
    }
}

// ================================
// RESET FOR NEW READING
// ================================
function startNewReading() {
    elements.resultSection.classList.add('hidden');
    document.querySelector('.upload-section').classList.remove('hidden');
    resetUpload();
    
    // Re-enable background animations
    document.body.classList.remove('showing-result');
    // Remove frame background for Scanning/Camera mode
    document.body.classList.remove('bg-frame');
    
    // Reset processing flags
    isProcessing = false;
    handDetected = false;
    lastCaptureTime = 0;
    hasShownResult = false;
    autoMode = true;
    mediaPipeFailed = false; // Reset MediaPipe failure flag
    
    // Reset camera status and create new button
    elements.cameraStatus.innerHTML = '<p>🔮 Đưa lòng bàn tay rõ ràng vào khung để tự động quét và bói</p>';
    
    // Show elements again
    document.querySelector('.footer').style.display = 'block';

    // Remove any existing fallback buttons
    const existingFallbackBtn = document.getElementById('fallbackCaptureBtn');
    if (existingFallbackBtn) {
        existingFallbackBtn.remove();
    }
    
    // Fortune teller welcomes back
    // FORCE: Always show QR message
    if (elements.fortuneTellerText) {
        elements.fortuneTellerText.textContent = "Bấm vào để mở rộng QR 🔮";
        elements.fortuneTellerText.style.cursor = 'pointer';
        elements.fortuneTellerText.onclick = function() {
            if (typeof showQRPopup === 'function') {
                showQRPopup();
            }
        };
    }
    
    // Create new camera button (but don't show it, auto start camera)
    const newBtn = document.createElement('button');
    newBtn.id = 'startCameraBtn';
    newBtn.className = 'action-btn primary';
    newBtn.style.marginTop = '1rem';
    newBtn.style.display = 'none'; // Hide button, auto start camera
    newBtn.textContent = '🎥 Bật camera';
    newBtn.addEventListener('click', (e) => {
        startCamera();
    });
}

// Fortune master selection
let selectedFortuneMaster = 'funny'; // Default to funny master

// Initialize fortune master selection
function initFortuneMasterSelection() {
    // Wait for DOM to be ready
    setTimeout(() => {
        const fortuneMasterBtns = document.querySelectorAll('.fortune-master-btn');
        fortuneMasterBtns.forEach((btn, index) => {
            btn.addEventListener('click', function() {
                // Remove active class from all buttons
                fortuneMasterBtns.forEach(b => b.classList.remove('active'));
                
                // Add active class to clicked button
                this.classList.add('active');
                
                // Update selected master
                selectedFortuneMaster = this.dataset.master;
                // Play selection sound
                if (typeof playSound === 'function') {
                    playSound('buttonClick');
                }
                
                // Show selection feedback
                const masterName = fortuneMasterPersonalities[selectedFortuneMaster].name;
                if (typeof showFortunePopup === 'function') {
                    showFortunePopup(`Đã chọn ${masterName}! 🎭`);
                }
            });
        });
        
        // Handle start fortune button
        const startFortuneBtn = document.getElementById('startFortuneBtn');
        if (startFortuneBtn) {
            startFortuneBtn.addEventListener('click', function() {
                // Play button click sound
                if (typeof playSound === 'function') {
                    playSound('buttonClick');
                }
                
                // Hide fortune master selection section
                const fortuneMasterSection = document.getElementById('fortuneMasterSection');
                if (fortuneMasterSection) {
                    fortuneMasterSection.classList.add('hidden');
                    }
                
                // Show upload section (camera section)
                const uploadSection = document.getElementById('uploadSection');
                if (uploadSection) {
                    uploadSection.classList.remove('hidden');
                    }
                
                // Remove frame background for Scanning/Camera mode (User request: keep old mystical bg)
                document.body.classList.remove('bg-frame');
                
                // Start camera after a short delay
                setTimeout(() => {
                    if (typeof startCamera === 'function') {
                        startCamera();
                    }
                }, 500);
            });
        }
    }, 100);
}

// Fortune master personalities
const fortuneMasterPersonalities = {
    funny: {
        name: 'Thầy Vui Tính',
        icon: '😄',
        style: 'hài hước, troll, vui vẻ',
        responses: {
            positive: [
                'Haha! Tay bạn đẹp quá, chắc chắn sẽ gặp may mắn! 😄',
                'Ôi trời ơi! Đường chỉ tay này nói bạn sẽ trúng số! 🎰',
                'Tuyệt vời! Bạn sẽ có một ngày đầy niềm vui! 🎉',
                'Wow! Tay bạn đẹp như tay người mẫu! 😍'
            ],
            neutral: [
                'Hmm, tay bạn bình thường thôi, nhưng vẫn đáng yêu! 😊',
                'Đường chỉ tay này... ừm... khá ổn! 👍',
                'Tay bạn có vẻ bình thường, nhưng tôi thích! 😄'
            ],
            negative: [
                'Ôi không! Tay bạn có vấn đề... nhưng đừng lo, tôi đùa thôi! 😂',
                'Haha! Tôi nói đùa, tay bạn vẫn ổn! 😄',
                'Đừng tin tôi, tôi chỉ đang troll thôi! 😜'
            ]
        }
    },
    grumpy: {
        name: 'Thầy Cục Súc',
        icon: '😠',
        style: 'nóng tính, thẳng thắn, cục súc',
        responses: {
            positive: [
                'Hmph! Tay bạn cũng tạm được, không tệ lắm! 😤',
                'Ừm... đường chỉ tay này không đến nỗi nào! 😠',
                'Tay bạn ổn, nhưng đừng tự mãn! 😡',
                'Khá ổn, nhưng còn nhiều việc phải làm! 😤'
            ],
            neutral: [
                'Tay bạn bình thường, không có gì đặc biệt! 😠',
                'Đường chỉ tay này... ừm... tạm được! 😤',
                'Không tệ, nhưng cũng không hay! 😡'
            ],
            negative: [
                'Tay bạn có vấn đề! Cần phải cẩn thận hơn! 😠',
                'Đường chỉ tay này không tốt! Phải thay đổi! 😡',
                'Tay bạn xấu! Cần phải cải thiện ngay! 😤'
            ]
        }
    },
    sad: {
        name: 'Thầy Buồn',
        icon: '😔',
        style: 'chán đời, bi quan, buồn bã',
        responses: {
            positive: [
                'Tay bạn đẹp... nhưng cuộc đời vẫn buồn... 😔',
                'Đường chỉ tay tốt... nhưng tôi vẫn thấy buồn... 😢',
                'Tay bạn ổn... nhưng tôi không vui... 😔',
                'Khá đẹp... nhưng tôi vẫn chán đời... 😞'
            ],
            neutral: [
                'Tay bạn bình thường... như tôi... 😔',
                'Đường chỉ tay này... ừm... tôi vẫn buồn... 😢',
                'Không tệ... nhưng tôi vẫn chán... 😞'
            ],
            negative: [
                'Tay bạn có vấn đề... như tôi... 😔',
                'Đường chỉ tay xấu... tôi cũng buồn... 😢',
                'Tay bạn không tốt... tôi cũng thế... 😞'
            ]
        }
    },
    bluff: {
        name: 'Thầy Chém Gió',
        icon: '🤥',
        style: 'khoác lác, phóng đại, chém gió',
        responses: {
            positive: [
                'WOW! Tay bạn đẹp nhất thế giới! Sẽ trở thành tỷ phú! 💰',
                'INCREDIBLE! Đường chỉ tay này nói bạn sẽ sống 200 tuổi! 🎉',
                'AMAZING! Bạn sẽ trúng số 10 lần liên tiếp! 🎰',
                'FANTASTIC! Tay bạn đẹp hơn cả tay người mẫu! 😍'
            ],
            neutral: [
                'Tay bạn bình thường... NHƯNG sẽ trở thành siêu sao! 🌟',
                'Đường chỉ tay này... ừm... SẼ THAY ĐỔI THẾ GIỚI! 🌍',
                'Không tệ... NHƯNG SẼ TRỞ THÀNH TỶ PHÚ! 💎'
            ],
            negative: [
                'Tay bạn có vấn đề... NHƯNG SẼ TRỞ THÀNH SIÊU ANH HÙNG! 🦸',
                'Đường chỉ tay xấu... NHƯNG SẼ CỨU THẾ GIỚI! 🌟',
                'Tay bạn không tốt... NHƯNG SẼ TRỞ THÀNH THIÊN TÀI! 🧠'
            ]
        }
    },
    dark: {
        name: 'Thầy Hài Hước Đen',
        icon: '😈',
        style: 'dark humor, châm biếm, mỉa mai',
        responses: {
            positive: [
                'Tay đẹp vậy mà vẫn độc thân à? Chắc tính cách có vấn đề 😈',
                'Đường đời tốt thế này... chắc sắp hết rồi 🖤',
                'May mắn quá! Nhưng may mắn thường không kéo dài đâu 😏',
                'Tay đẹp như thế này... chắc ai đó đang ghen tị lắm đây 😈'
            ],
            neutral: [
                'Tay bình thường... như cuộc đời bạn vậy 😏',
                'Không tốt không xấu... cũng như mọi thứ khác của bạn 🖤',
                'Đường chỉ tay này... ừm... cũng bình thường thôi, đừng mơ 😈'
            ],
            negative: [
                'Tay xấu vậy mà vẫn dám xem bói? Dũng cảm đấy 😈',
                'Đường đời khó khăn... nhưng ít ra bạn đã quen rồi nhỉ? 🖤',
                'Vận xui thế này... may là bạn đã quen sống với nó 😏'
            ]
        }
    },
    poetic: {
        name: 'Thầy Thơ Mộng',
        icon: '🌸',
        style: 'thơ ca, văn vẻ, bay bổng',
        responses: {
            positive: [
                'Lòng bàn tay như cánh hoa anh đào nở rộ... Vận mệnh rực rỡ như bình minh 🌸',
                'Đường chỉ tay như dòng suối trong veo... Cuộc đời ngập tràn hạnh phúc 🌺',
                'Như mây trắng bay trên trời cao... Tương lai tươi sáng như ánh dương 🌼',
                'Lòng bàn tay như vườn xuân... May mắn như hoa tươi nở rộ 🌹'
            ],
            neutral: [
                'Đường đời như gió nhẹ... Không mạnh mẽ nhưng cũng không yếu đuối 🌸',
                'Như mây trôi... Không biết đâu là nơi về 🌺',
                'Lòng bàn tay như thu... Có chút buồn nhưng cũng có chút đẹp 🍂'
            ],
            negative: [
                'Như mưa thu buồn... Nhưng sau mưa trời sẽ sáng 🌧️',
                'Đường đời như đêm đông... Lạnh lẽo nhưng sẽ có xuân về 🌸',
                'Như lá úa rơi... Nhưng rồi sẽ có lá non mọc 🍃'
            ]
        }
    }
};

// ================================
// EVENT LISTENERS
// ================================

// Upload area click (guard if upload area exists)
if (elements.uploadArea && elements.palmInput) {
    elements.uploadArea.addEventListener('click', (e) => {
        if (!e.target.closest('.remove-btn')) {
            playSound('buttonClick');
            elements.palmInput.click();
        }
    });
}

// File input change (guard if input exists)
if (elements.palmInput) {
    elements.palmInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            handleFileSelect(file);
        }
    });
}

// Drag and drop (guard if upload area exists)
if (elements.uploadArea) {
    elements.uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        elements.uploadArea.classList.add('dragover');
    });

    elements.uploadArea.addEventListener('dragleave', () => {
        elements.uploadArea.classList.remove('dragover');
    });

    elements.uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        elements.uploadArea.classList.remove('dragover');
        
        const file = e.dataTransfer.files[0];
        if (file) {
            handleFileSelect(file);
        }
    });
}

// Remove image (guard if remove button exists)
if (elements.removeBtn) {
    elements.removeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        resetUpload();
    });
}

// Fortune button
if (elements.fortuneBtn) {
    elements.fortuneBtn.addEventListener('click', () => {
        if (typeof playSound === 'function') {
            playSound('buttonClick');
        }
        if (typeof getFortune === 'function') {
            getFortune();
        }
    });
}

// New reading button - reload page from beginning
if (elements.newReadingBtn) {
    elements.newReadingBtn.addEventListener('click', () => {
        if (typeof playSound === 'function') {
            playSound('buttonClick');
            playSound('mysticalWhoosh'); // Add magical transition sound
        }
        if (typeof stopBackgroundMusic === 'function') {
            stopBackgroundMusic(); // Stop any playing music before reload
        }
        
        // Reload the page from the beginning
        window.location.reload();
    });
}

// Share button
if (elements.shareBtn) {
    elements.shareBtn.addEventListener('click', () => {
        if (typeof playSound === 'function') {
            playSound('success');
        }
        if (typeof shareFortune === 'function') {
            shareFortune();
        }
    });
}

// No manual camera button - auto start only

// ================================
// KEYBOARD SHORTCUTS
// ================================
document.addEventListener('keydown', (e) => {
    // Escape key to reset
    if (e.key === 'Escape' && !elements.resultSection.classList.contains('hidden')) {
        startNewReading();
    }
    
    // Enter key to start fortune telling
    if (e.key === 'Enter' && !elements.fortuneBtn.disabled && 
        !elements.loadingSection.classList.contains('hidden') === false) {
        getFortune();
    }
});

// ================================
// AUDIO SYSTEM
// ================================

// Initialize audio context
function initAudioContext() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
}

// Create sound effects using Web Audio API
function createSound(frequency, duration, type = 'sine', volume = 0.3) {
    if (!audioContext) initAudioContext();
    
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
    oscillator.type = type;
    
    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(volume, audioContext.currentTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + duration);
}

// Predefined sound effects
const soundEffects = {
    // Hand detection sound - clear and pleasant chime
    handDetected: () => {
        createSound(523, 0.2, 'sine', 0.15); // C5 - clear and pleasant
        setTimeout(() => createSound(659, 0.2, 'sine', 0.12), 80); // E5 - perfect fifth
        setTimeout(() => createSound(784, 0.3, 'sine', 0.1), 160); // G5 - perfect fifth
    },
    
    // Start scanning sound - clear and pleasant sparkle
    startScanning: () => {
        createSound(440, 0.15, 'sine', 0.2); // A4 - clear and pleasant
        setTimeout(() => createSound(554, 0.15, 'sine', 0.15), 60); // C#5 - major third
        setTimeout(() => createSound(659, 0.15, 'sine', 0.12), 120); // E5 - perfect fifth
        setTimeout(() => createSound(784, 0.2, 'sine', 0.1), 180); // G5 - perfect fifth
    },
    
    // Fortune complete sound - clear and pleasant completion
    fortuneComplete: () => {
        createSound(330, 0.3, 'sine', 0.2); // E4 - clear and pleasant
        setTimeout(() => createSound(440, 0.3, 'sine', 0.18), 150); // A4 - perfect fourth
        setTimeout(() => createSound(554, 0.3, 'sine', 0.15), 300); // C#5 - major third
        setTimeout(() => createSound(659, 0.4, 'sine', 0.12), 450); // E5 - perfect fifth
    },
    
    // Button click sound - clear and pleasant click
    buttonClick: () => {
        createSound(800, 0.08, 'sine', 0.08); // Clear and pleasant click
    },
    
    // Error sound - gentle and clear warning
    error: () => {
        createSound(400, 0.2, 'sine', 0.15); // Clear and gentle
        setTimeout(() => createSound(350, 0.2, 'sine', 0.12), 100);
    },
    
    // Success sound - clear and pleasant chime
    success: () => {
        createSound(523, 0.15, 'sine', 0.15); // C5 - clear and pleasant
        setTimeout(() => createSound(659, 0.15, 'sine', 0.12), 80); // E5 - perfect fifth
        setTimeout(() => createSound(784, 0.2, 'sine', 0.1), 160); // G5 - perfect fifth
    },
    
    // Mystical sparkle - clear and pleasant twinkle
    mysticalSparkle: () => {
        createSound(880, 0.08, 'sine', 0.12); // A5 - clear and pleasant
        setTimeout(() => createSound(1109, 0.08, 'sine', 0.1), 40); // C#6 - major third
        setTimeout(() => createSound(1319, 0.08, 'sine', 0.08), 80); // E6 - perfect fifth
        setTimeout(() => createSound(1568, 0.1, 'sine', 0.06), 120); // G6 - perfect fifth
    },
    
    // Mystical whoosh - clear and pleasant transition
    mysticalWhoosh: () => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        const filter = audioContext.createBiquadFilter();
        
        oscillator.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.type = 'sine'; // Clean sine wave
        oscillator.frequency.setValueAtTime(300, audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(1200, audioContext.currentTime + 0.4);
        
        filter.type = 'highpass'; // High-pass for clarity
        filter.frequency.setValueAtTime(200, audioContext.currentTime);
        filter.frequency.exponentialRampToValueAtTime(1000, audioContext.currentTime + 0.4);
        
        gainNode.gain.setValueAtTime(0, audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.08, audioContext.currentTime + 0.1);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.4);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.4);
    },
    
    // Mystical bell - clear and pleasant chime
    mysticalBell: () => {
        const oscillator1 = audioContext.createOscillator();
        const oscillator2 = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        const filter = audioContext.createBiquadFilter();
        
        oscillator1.connect(filter);
        oscillator2.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        // Clear bell frequencies - perfect intervals
        oscillator1.frequency.setValueAtTime(523, audioContext.currentTime); // C5 - clear and pleasant
        oscillator2.frequency.setValueAtTime(659, audioContext.currentTime); // E5 - perfect fifth
        
        oscillator1.type = 'sine'; // Pure sine for clarity
        oscillator2.type = 'sine'; // Pure sine for clarity
        
        filter.type = 'highpass'; // High-pass for clarity
        filter.frequency.setValueAtTime(400, audioContext.currentTime);
        filter.Q.setValueAtTime(0.5, audioContext.currentTime);
        
        gainNode.gain.setValueAtTime(0, audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.15, audioContext.currentTime + 0.1);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 1.5);
        
        oscillator1.start(audioContext.currentTime);
        oscillator2.start(audioContext.currentTime);
        
        oscillator1.stop(audioContext.currentTime + 1.5);
        oscillator2.stop(audioContext.currentTime + 1.5);
    },
    
    // Result reveal sound - magical and satisfying
    resultReveal: () => {
        const oscillator1 = audioContext.createOscillator();
        const oscillator2 = audioContext.createOscillator();
        const oscillator3 = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        const filter = audioContext.createBiquadFilter();
        
        oscillator1.connect(filter);
        oscillator2.connect(filter);
        oscillator3.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        // Magical ascending scale - C major
        oscillator1.frequency.setValueAtTime(523, audioContext.currentTime); // C5
        oscillator2.frequency.setValueAtTime(659, audioContext.currentTime); // E5
        oscillator3.frequency.setValueAtTime(784, audioContext.currentTime); // G5
        
        oscillator1.type = 'sine';
        oscillator2.type = 'sine';
        oscillator3.type = 'triangle';
        
        filter.type = 'highpass';
        filter.frequency.setValueAtTime(300, audioContext.currentTime);
        filter.Q.setValueAtTime(0.7, audioContext.currentTime);
        
        gainNode.gain.setValueAtTime(0, audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.2, audioContext.currentTime + 0.1);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 2);
        
        // Create magical ascending effect
        const createAscendingEffect = () => {
            const time = audioContext.currentTime;
            oscillator1.frequency.setValueAtTime(523, time);
            oscillator2.frequency.setValueAtTime(659, time);
            oscillator3.frequency.setValueAtTime(784, time);
            
            // Ascend to higher notes
            setTimeout(() => {
                oscillator1.frequency.setValueAtTime(659, audioContext.currentTime); // E5
                oscillator2.frequency.setValueAtTime(784, audioContext.currentTime); // G5
                oscillator3.frequency.setValueAtTime(880, audioContext.currentTime); // A5
            }, 200);
            
            setTimeout(() => {
                oscillator1.frequency.setValueAtTime(784, audioContext.currentTime); // G5
                oscillator2.frequency.setValueAtTime(880, audioContext.currentTime); // A5
                oscillator3.frequency.setValueAtTime(1047, audioContext.currentTime); // C6
            }, 400);
        };
        
        oscillator1.start(audioContext.currentTime);
        oscillator2.start(audioContext.currentTime);
        oscillator3.start(audioContext.currentTime);
        
        createAscendingEffect();
        
        oscillator1.stop(audioContext.currentTime + 2);
        oscillator2.stop(audioContext.currentTime + 2);
        oscillator3.stop(audioContext.currentTime + 2);
    },
    
    // Ambient background - clear and pleasant tone
    ambient: () => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        const filter = audioContext.createBiquadFilter();
        
        oscillator.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.setValueAtTime(440, audioContext.currentTime); // A4 - clear and pleasant
        oscillator.type = 'sine'; // Pure sine for clarity
        
        filter.type = 'highpass'; // High-pass for clarity
        filter.frequency.setValueAtTime(300, audioContext.currentTime);
        filter.Q.setValueAtTime(0.5, audioContext.currentTime);
        
        gainNode.gain.setValueAtTime(0, audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.03, audioContext.currentTime + 2);
        
        oscillator.start(audioContext.currentTime);
        
        // Stop after 8 seconds
        setTimeout(() => {
            gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 2);
            oscillator.stop(audioContext.currentTime + 2);
        }, 6000);
    },
    
    // Background music - now handled by generateHomepageMusic
    backgroundMusic: () => {
        // This is now handled by the new system
        },
    
    // Fortune telling music - now handled by generateFortuneMusic
    fortuneMusic: () => {
        // This is now handled by the new system
        },
    
    // Homepage ambient music - now handled by generateHomepageMusic
    homepageMusic: () => {
        // This is now handled by the new system
        }
};

// Play sound effect
function playSound(soundName) {
    try {
        if (soundEnabled && soundEffects[soundName]) {
            soundEffects[soundName]();
        }
    } catch (error) {
        }
}

// Stop background music
function stopBackgroundMusic() {
    if (backgroundMusic && isBackgroundPlaying) {
        try {
            backgroundMusic.pause();
            backgroundMusic.currentTime = 0;
            backgroundMusic = null;
            isBackgroundPlaying = false;
        } catch (error) {
            backgroundMusic = null;
            isBackgroundPlaying = false;
        }
    }
}

// Start background music
function startBackgroundMusic() {
    if (soundEnabled && !isBackgroundPlaying) {
        playBackgroundMusic('homepage');
    }
}

// Start fortune music
function startFortuneMusic() {
    if (soundEnabled) {
        playBackgroundMusic('fortune');
    }
}

// Start homepage music
function startHomepageMusic() {
    if (soundEnabled && !isBackgroundPlaying) {
        playBackgroundMusic('homepage');
    }
}

// Play background music with HTML5 Audio
function playBackgroundMusic(type) {
    try {
        // Stop current music
        stopBackgroundMusic();
        
        // Create new audio element
        const audio = new Audio();
        audio.loop = true;
        audio.volume = backgroundVolume;
        audio.preload = 'auto';
        
        // Set audio source based on type
        if (type === 'homepage') {
            audio.src = 'audio/homepage-bg.mp3';
        } else if (type === 'fortune') {
            audio.src = 'audio/fortune-bg.mp3';
        }
        
        // Play the music with retry logic
        const playMusic = () => {
            audio.play().then(() => {
                backgroundMusic = audio;
                isBackgroundPlaying = true;
                }).catch(error => {
                // Retry after a short delay
                setTimeout(() => {
                    playMusic();
                }, 1000);
            });
        };
        
        // Start playing
        playMusic();
        
    } catch (error) {
        }
}

// Sound is now always enabled - no toggle needed

// Update background music volume
function updateBackgroundVolume(volume) {
    backgroundVolume = volume / 100; // Convert 0-100 to 0-1
    localStorage.setItem('backgroundVolume', volume);
    
    // Update current background music volume if playing
    if (backgroundMusic && isBackgroundPlaying) {
        backgroundMusic.volume = backgroundVolume;
    }
}

// Preload audio files for better performance
function preloadAudioFiles() {
    try {
        // Preload homepage background music
        const homepageAudio = new Audio();
        homepageAudio.src = 'audio/homepage-bg.mp3';
        homepageAudio.preload = 'auto';
        
        // Preload fortune background music
        const fortuneAudio = new Audio();
        fortuneAudio.src = 'audio/fortune-bg.mp3';
        fortuneAudio.preload = 'auto';
        
        } catch (error) {
        }
}

// Music generation functions removed - now using real MP3 files

// ================================
// MOBILE DETECTION
// ================================
function isMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
           window.innerWidth <= 768;
}

// ================================
// INITIALIZE
// ================================
document.addEventListener('DOMContentLoaded', () => {
    soundEnabled = true;
    
    // Load volume preference from localStorage (default to 60% if not set)
    const savedVolume = localStorage.getItem('backgroundVolume');
    if (savedVolume !== null) {
        backgroundVolume = savedVolume / 100;
    } else {
        // Set default volume to 60% if no saved preference
        backgroundVolume = 0.6;
        localStorage.setItem('backgroundVolume', '60');
    }
    
    // Load usage count on page load
    loadUsageCount();
    
    // Increment visit count
    incrementVisitCount();
    
    // Preload audio files
    preloadAudioFiles();
    
    // Initialize audio context and start music immediately
    initAudioContext();
    
    // Set default background to frame (Homepage)
    document.body.classList.add('bg-frame');
    if (soundEnabled) {
        // Start homepage music immediately
        setTimeout(() => {
            startHomepageMusic();
        }, 1000);
    }
    
    // Also start on first user interaction as backup
    document.addEventListener('click', () => {
        if (soundEnabled && !isBackgroundPlaying) {
            if (typeof playSound === 'function') {
                playSound('ambient'); // Play subtle ambient sound on first interaction
            }
            if (typeof startHomepageMusic === 'function') {
                startHomepageMusic();
            }
        }
    }, { once: true });
    
    
    // Check if mobile
    if (isMobile()) {
        }
    
    // Fortune teller greets on startup
    setTimeout(() => {
        // Add mystical sparkle when fortune teller greets
        setTimeout(() => {
            if (typeof playSound === 'function') {
                playSound('mysticalSparkle');
            }
        }, 1000);
    }, 500);
    
    // Initialize fortune master selection with delay
    setTimeout(() => {
        if (typeof initFortuneMasterSelection === 'function') {
            initFortuneMasterSelection();
        } else {
            }
        }, 500);
        
        
    
    });

// ================================
// EASTER EGG - Konami Code
// ================================
let konamiCode = [];
const konamiSequence = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];

document.addEventListener('keydown', (e) => {
    konamiCode.push(e.key);
    konamiCode = konamiCode.slice(-10);
    
    if (konamiCode.join(',') === konamiSequence.join(',')) {
        document.body.style.animation = 'rainbow 2s linear infinite';
        setTimeout(() => {
            document.body.style.animation = '';
        }, 10000);
        
        }
});

// Add rainbow animation
const style = document.createElement('style');
style.textContent = `
    @keyframes rainbow {
        0% { filter: hue-rotate(0deg); }
        100% { filter: hue-rotate(360deg); }
    }
`;
document.head.appendChild(style);

// QR Popup functions
function showQRPopup() {
    // Create popup element
    const popup = document.createElement('div');
    popup.className = 'qr-popup';
    popup.innerHTML = `
        <div class="qr-popup-content">
            <h3 class="qr-popup-title">📱 QR Code</h3>
            <img src="QRCode.png" alt="QR Code" class="qr-popup-code">
            <p class="qr-popup-text">
                Quét mã QR để truy cập TỬ VI HỌC ĐƯỜNG trên điện thoại của bạn
            </p>
            <button class="qr-popup-close" onclick="hideQRPopup()">
                Đóng
            </button>
        </div>
    `;
    
    // Add to body
    document.body.appendChild(popup);
    
    // Close on background click
    popup.addEventListener('click', (e) => {
        if (e.target === popup) {
            hideQRPopup();
        }
    });
    
    // Close on Escape key
    const handleEscape = (e) => {
        if (e.key === 'Escape') {
            hideQRPopup();
            document.removeEventListener('keydown', handleEscape);
        }
    };
    document.addEventListener('keydown', handleEscape);
}

function hideQRPopup() {
    const popup = document.querySelector('.qr-popup');
    if (popup) {
        popup.remove();
    }
}

// ================================
// USAGE COUNTER
// ================================
async function loadUsageCount() {
    try {
        const response = await fetch('/api/get-usage');
        const data = await response.json();
        
        if (data.success) {
            const countElement = document.getElementById('usageCount');
            if (countElement) {
                countElement.textContent = data.count ?? 0;
            }
            const visitEl = document.getElementById('visitCount');
            if (visitEl) {
                visitEl.textContent = data.visits ?? 0;
            }
        }
    } catch (error) {
        const countElement = document.getElementById('usageCount');
        if (countElement) countElement.textContent = '...';
        const visitEl = document.getElementById('visitCount');
        if (visitEl) visitEl.textContent = '...';
    }
}

async function incrementVisitCount() {
    try {
        const res = await fetch('/api/visit', { method: 'POST' });
        const data = await res.json();
        const visitEl = document.getElementById('visitCount');
        if (visitEl && data && data.success) {
            visitEl.textContent = data.visits;
        }
    } catch {}
}

async function incrementUsageCount() {
    try {
        const response = await fetch('/api/increment-usage', {
            method: 'POST'
        });
        const data = await response.json();
        
        if (data.success) {
            const countElement = document.getElementById('usageCount');
            if (countElement) {
                countElement.textContent = data.count;
            }
        }
    } catch (error) {
        }
}

// Make functions globally available
window.showQRPopup = showQRPopup;
window.hideQRPopup = hideQRPopup;
window.loadUsageCount = loadUsageCount;
window.incrementUsageCount = incrementUsageCount;
