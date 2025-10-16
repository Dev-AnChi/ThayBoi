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
    console.log('🔮 getFortune called, selectedFile:', !!selectedFile, 'isProcessing:', isProcessing);
    
    if (!selectedFile) {
        console.log('❌ No selected file, aborting');
        return;
    }
    if (isProcessing) {
        console.log('❌ Already processing, aborting');
        return;
    }
    
    console.log('✅ Starting fortune telling process...');
    isProcessing = true;

    try {
        // Show loading
        console.log('📱 Showing loading screen...');
        document.querySelector('.upload-section').classList.add('hidden');
        elements.resultSection.classList.add('hidden');
        elements.loadingSection.classList.remove('hidden');
        
        // Fortune teller is analyzing (keep current message)
        // Don't change message here, keep the capture message

        // Create form data
        const formData = new FormData();
        formData.append('palmImage', selectedFile);
        formData.append('language', 'vi');

        console.log('📤 Sending request to API...');
        // Call API
        const response = await fetch('/api/fortune-telling', {
            method: 'POST',
            body: formData
        });

        console.log('📥 Received response, status:', response.status);
        const data = await response.json();
        if (!response.ok) {
            if (data && data.error === 'MODEL_OVERLOADED') {
                throw new Error('MODEL_OVERLOADED');
            }
            throw new Error(data && data.message || 'API error');
        }
        console.log('📊 Response data:', data);

        if (data.success) {
            console.log('✅ Fortune telling successful!');
            // Show result
            elements.loadingSection.classList.add('hidden');
            elements.resultSection.classList.remove('hidden');
            
            console.log('📱 Showing result screen...');
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
            updateFortuneTellerSpeech(randomMessage, 3000);
            
            // After showing result, keep quiet
            setTimeout(() => {
                updateFortuneTellerSpeech("", 0); // Empty message, no auto reset
            }, 3000);
            
            // Display fortune sections
            console.log('🎨 Displaying fortune sections...');
            displayFortuneSections(data.fortune);
        } else {
            console.log('❌ Fortune telling failed:', data.message);
            throw new Error(data.message || 'Fortune telling failed');
        }

    } catch (error) {
        console.error('❌ Fortune error:', error);
        
        // Hide loading
        elements.loadingSection.classList.add('hidden');
        document.querySelector('.upload-section').classList.remove('hidden');
        
        if (String(error && error.message) === 'MODEL_OVERLOADED') {
            updateFortuneTellerSpeech("AI đang đông khách quá! Đợi vài giây rồi thử lại nhé ✨", 6000);
            alert('Dịch vụ AI đang quá tải. Vui lòng thử lại sau ít phút.');
        } else {
            // Fortune teller apologizes
            updateFortuneTellerSpeech("Có sự cố! Thử lại nhé! 😅", 5000);
            alert(messages.fortuneError);
        }
    } finally {
        console.log('🏁 Fortune process completed, resetting isProcessing flag');
        if (!hasShownResult) {
            isProcessing = false;
        }
    }
}

// ================================
// DISPLAY FORTUNE SECTIONS
// ================================
function displayFortuneSections(fortuneData) {
    const sections = [
        { id: 'introContent', content: fortuneData.intro },
        { id: 'palmLinesContent', content: fortuneData.palmLines },
        { id: 'loveContent', content: fortuneData.love },
        { id: 'careerContent', content: fortuneData.career },
        { id: 'healthContent', content: fortuneData.health },
        { id: 'adviceContent', content: fortuneData.advice }
    ];

    sections.forEach((section, index) => {
        const element = document.getElementById(section.id);
        if (element && section.content) {
            // Hide section initially
            element.parentElement.style.opacity = '0';
            element.parentElement.style.transform = 'translateY(20px)';
            
            // Show section with delay
            setTimeout(() => {
                element.parentElement.style.transition = 'all 0.6s ease-out';
                element.parentElement.style.opacity = '1';
                element.parentElement.style.transform = 'translateY(0)';
                
                // Typewriter effect for content
                typeWriter(section.content, element, 15);
            }, index * 300);
        }
    });
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
function updateFortuneTellerSpeech(message, duration = 3000) {
    if (!elements.fortuneTellerText) return;
    
    elements.fortuneTellerText.textContent = message;
    
    // Add typing effect
    elements.fortuneTellerText.style.opacity = '0.7';
    setTimeout(() => {
        elements.fortuneTellerText.style.opacity = '1';
    }, 200);
    
    // Auto reset after duration
    if (duration > 0) {
        setTimeout(() => {
            resetFortuneTellerSpeech();
        }, duration);
    }
}

function resetFortuneTellerSpeech() {
    const defaultMessages = [
        "Đưa lòng bàn tay vào khung nhé ✋",
        "Chờ bạn đưa tay vào đây... 🤲",
        "Lòng bàn tay sẽ tiết lộ vận mệnh! 🔮"
    ];
    
    const randomMessage = defaultMessages[Math.floor(Math.random() * defaultMessages.length)];
    updateFortuneTellerSpeech(randomMessage, 0); // No auto reset
}

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
        console.log('📷 Available cameras:', videoInputs.map(d => ({ id: d.deviceId, label: d.label })));
        return videoInputs;
    } catch (e) {
        console.log('Failed to enumerate devices:', e);
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
    console.log('🎥 Starting camera...');
    
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.log('❌ Camera not supported');
        elements.cameraStatus.innerHTML = `
            <p style="color: #e74c3c;">❌ Trình duyệt không hỗ trợ camera</p>
            <p style="font-size: 0.9rem; margin-top: 0.5rem;">Vui lòng sử dụng trình duyệt hiện đại hơn (Chrome, Safari, Firefox)</p>
        `;
        return;
    }

    try {
        console.log('📹 Requesting camera access...');
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
            console.log('⚠️ No camera available, showing fallback message');
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
            elements.cameraStatus.innerHTML = '<p>🔮 Đưa lòng bàn tay rõ ràng vào khung để tự động quét và bói</p>';
        }, 2000);
        
        console.log('📊 Camera starting with flags:', { isProcessing, handDetected, hasShownResult, autoMode });
        
        // Initialize MediaPipe hands only after video metadata is ready
        const initHands = () => {
            elements.cameraStatus.innerHTML = '<p style="color: #3498db;">🔧 Đang khởi tạo quét bàn tay...</p>';
            console.log('ℹ️ Video metadata ready, initializing hand detection');
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
        updateFortuneTellerSpeech("Camera sẵn sàng! Đưa lòng bàn tay vào khung nhé! ✋", 5000);
        
    } catch (e) {
        console.error('❌ Camera error:', e);
        
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
    console.log('🛑 Stopping camera...');
    
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
            console.log('Camera stop error (ignored):', e);
        }
        mpCamera = null;
    }
    
    // Close MediaPipe hands
    if (hands) {
        try {
            hands.close();
        } catch (e) {
            console.log('Hands close error (ignored):', e);
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
    
    console.log('✅ Camera stopped completely');
}

function closeCamera() {
    console.log('❌ Closing camera...');
    stopCamera();
    
    // Hide camera section, show upload area
    elements.cameraSection.classList.add('hidden');
    elements.uploadArea.classList.remove('hidden');
    
    updateFortuneTellerSpeech("Chụp hoặc tải ảnh lòng bàn tay lên nhé! 📷", 5000);
}

function showMobileUploadInterface() {
    console.log('📱 Setting up mobile upload interface...');
    
    // Replace entire camera section with mobile upload interface
    const mobileUploadHTML = `
        <div class="mobile-upload-container">
            <div class="upload-icon-large">🖐️</div>
            <h3 style="color: #9b59b6; margin: 1rem 0; font-size: 1.5rem;">Chụp ảnh lòng bàn tay</h3>
            <p style="margin-bottom: 2rem; line-height: 1.6; color: #bdc3c7;">
                📱 Trên điện thoại, hãy chụp ảnh lòng bàn tay rõ ràng<br>
                hoặc chọn từ thư viện ảnh
            </p>
            
            <div style="display: flex; flex-direction: column; gap: 1rem; margin-bottom: 2rem;">
                <button class="action-btn primary large" id="mobileCameraBtn">
                    📷 Chụp ảnh mới
                </button>
                
                <button class="action-btn secondary large" id="mobileGalleryBtn">
                    🖼️ Chọn từ thư viện
                </button>
            </div>
            
            <div style="padding: 1rem; background: rgba(155, 89, 182, 0.1); border-radius: 10px; border: 1px solid rgba(155, 89, 182, 0.3);">
                <p style="font-size: 0.9rem; color: #9b59b6; margin: 0; line-height: 1.5;">
                    💡 <strong>Mẹo:</strong> Chụp ảnh lòng bàn tay với ánh sáng tốt, 
                    đặt tay phẳng và rõ ràng để có kết quả chính xác nhất
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
    updateFortuneTellerSpeech("Chào bạn! Hãy chụp ảnh lòng bàn tay nhé! 📷✋", 5000);
}

async function switchCamera() {
    console.log('🔄 Switching camera...');
    
    if (availableCameras.length <= 1) {
        alert('Chỉ có 1 camera khả dụng');
        return;
    }
    
    // Cycle through cameras
    currentCameraIndex = (currentCameraIndex + 1) % availableCameras.length;
    const selectedCamera = availableCameras[currentCameraIndex];
    
    console.log(`📷 Switching to camera ${currentCameraIndex}:`, selectedCamera.label);
    
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
        
        console.log('✅ Camera switched successfully');
        updateFortuneTellerSpeech(`Đã chuyển sang camera ${currentCameraIndex + 1}! ✨`, 3000);
        
    } catch (e) {
        console.error('❌ Camera switch failed:', e);
        alert('Không thể chuyển camera. Thử lại nhé!');
        // Fallback to normal start
        startCamera();
    }
}

function captureFrameToFile() {
    console.log('📷 captureFrameToFile called');
    
    const video = elements.cameraVideo;
    const canvas = elements.captureCanvas;
    const width = video.videoWidth;
    const height = video.videoHeight;
    
    console.log('📐 Video dimensions:', width, 'x', height);
    
    if (!width || !height) {
        console.log('❌ Invalid video dimensions, aborting capture');
        return;
    }

    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, width, height);

    console.log('🖼️ Canvas drawn, converting to blob...');

    canvas.toBlob((blob) => {
        if (!blob) {
            console.log('❌ Failed to create blob');
            return;
        }
        console.log('✅ Blob created, size:', blob.size, 'bytes');
        
        const file = new File([blob], `camera-palm-${Date.now()}.png`, { type: 'image/png' });
        console.log('📁 File created:', file.name);
        
        handleFileSelect(file);
        // Auto trigger fortune after file is ready
        setTimeout(() => {
            console.log('🔮 Auto triggering getFortune...');
            getFortune();
        }, 100);
    }, 'image/png', 0.95);
}


function initializeHandDetection() {
    console.log('🔍 Initializing hand detection...');
    
    // If MediaPipe has failed before, use fallback mode
    if (mediaPipeFailed) {
        console.log('⚠️ MediaPipe previously failed, using fallback mode');
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
                console.log('🔄 Fallback: Manual capture triggered');
                autoCapture();
            }
        });
        elements.cameraStatus.appendChild(fallbackBtn);
        
        // Update fortune teller speech
        updateFortuneTellerSpeech("MediaPipe gặp sự cố! Hãy đưa tay vào khung và bấm nút chụp nhé! 📸", 0);
        return;
    }
    
    // Clean up existing instances completely
    if (hands) {
        try {
            hands.close();
        } catch (e) {
            console.log('Closing existing hands instance:', e);
        }
        hands = null;
    }
    
    if (mpCamera) {
        try {
            mpCamera.stop();
        } catch (e) {
            console.log('Stopping existing camera:', e);
        }
        mpCamera = null;
    }
    
    if (typeof Hands === 'undefined') {
        console.log('❌ MediaPipe not loaded, using fallback detection');
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
                console.log('🔄 Fallback: Manual capture triggered');
                autoCapture();
            }
        });
        elements.cameraStatus.appendChild(fallbackBtn);
        
        updateFortuneTellerSpeech("MediaPipe chưa tải xong! Hãy đưa tay vào khung và bấm nút chụp nhé! 📸", 0);
        return;
    }

    console.log('✅ MediaPipe Hands loaded, setting up...');
    
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
        
        console.log('🎯 Starting camera processing...');
        
        // Start processing video frames with fresh camera instance
        mpCamera = new Camera(elements.cameraVideo, {
            onFrame: async () => {
                if (hands && !isProcessing && !hasShownResult) {
                    try {
                        await hands.send({ image: elements.cameraVideo });
                    } catch (e) {
                        console.log('Hands send error, switching to fallback mode:', e);
                        mediaPipeFailed = true;
                        // Stop MediaPipe and use fallback
                        if (mpCamera) {
                            try {
                                mpCamera.stop();
                            } catch (e2) {
                                console.log('Camera stop error:', e2);
                            }
                            mpCamera = null;
                        }
                        if (hands) {
                            try {
                                hands.close();
                            } catch (e2) {
                                console.log('Hands close error:', e2);
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
                                console.log('🔄 Fallback: Manual capture triggered');
                                autoCapture();
                            }
                        });
                        elements.cameraStatus.appendChild(fallbackBtn);
                        
                        updateFortuneTellerSpeech("MediaPipe gặp lỗi! Hãy đưa tay vào khung và bấm nút chụp nhé! 📸", 0);
                    }
                }
            },
            width: 640,
            height: 480
        });
        mpCamera.start();
        
        console.log('✅ Hand detection initialized successfully');
    } catch (e) {
        console.error('❌ MediaPipe initialization failed, switching to fallback:', e);
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
                console.log('🔄 Fallback: Manual capture triggered');
                autoCapture();
            }
        });
        elements.cameraStatus.appendChild(fallbackBtn);
        
        updateFortuneTellerSpeech("MediaPipe khởi tạo thất bại! Hãy đưa tay vào khung và bấm nút chụp nhé! 📸", 0);
    }
}

function onHandResults(results) {
    if (!autoMode || isProcessing || hasShownResult) return; // Don't process if already processing

    const video = elements.cameraVideo;
    const videoWidth = video.videoWidth;
    const videoHeight = video.videoHeight;
    
    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        console.log('✋ Hand detected!', results.multiHandLandmarks.length, 'hands');
        
        const hand = results.multiHandLandmarks[0];
        
        // Check if it's a proper palm (not just fingers)
        const isProperPalm = checkPalmQuality(hand);
        
        if (!isProperPalm) {
            console.log('❌ Not a proper palm, waiting for better view...');
            elements.handDetectionBox.classList.remove('active');
            elements.autoCaptureIndicator.classList.remove('active');
            handDetected = false;
            
            // Fortune teller gives guidance (only occasionally)
            if (Math.random() < 0.3) { // Only 30% chance to speak
                updateFortuneTellerSpeech("Xòe tay rõ hơn nhé! 🤲", 4000);
            }
            return;
        }
        
        console.log('✅ Proper palm detected!');
        
        // Fortune teller acknowledges good palm (only once)
        if (!handDetected) {
            updateFortuneTellerSpeech("Tuyệt! Giữ yên nhé... 🔮", 3000);
        }
        
        // Calculate hand bounding box
        const xCoords = hand.map(point => point.x);
        const yCoords = hand.map(point => point.y);
        const minX = Math.min(...xCoords);
        const maxX = Math.max(...xCoords);
        const minY = Math.min(...yCoords);
        const maxY = Math.max(...yCoords);
        
        // Convert to pixel coordinates
        const boxX = minX * videoWidth;
        const boxY = minY * videoHeight;
        const boxWidth = (maxX - minX) * videoWidth;
        const boxHeight = (maxY - minY) * videoHeight;
        
        // Update detection box
        elements.handDetectionBox.style.left = boxX + 'px';
        elements.handDetectionBox.style.top = boxY + 'px';
        elements.handDetectionBox.style.width = boxWidth + 'px';
        elements.handDetectionBox.style.height = boxHeight + 'px';
        elements.handDetectionBox.classList.add('active');
        
        // Show auto capture indicator
        elements.autoCaptureIndicator.classList.add('active');
        
        // Auto capture if palm is stable for 3 seconds (longer for better quality)
        if (!handDetected) {
            console.log('⏱️ Palm stable, starting 3-second countdown...');
            handDetected = true;
            
            // Fortune teller starts countdown
            updateFortuneTellerSpeech("Đếm ngược: 3... 2... 1... 📸", 3000);
            
            if (handTimerId) clearTimeout(handTimerId);
            handTimerId = setTimeout(() => {
                if (handDetected && autoMode && !isProcessing && !hasShownResult) {
                    console.log('📸 Auto capturing palm now!');
                    autoCapture();
                }
            }, 3000);
        }
    } else {
        // No hand detected
        if (handDetected) {
            console.log('❌ Hand lost, resetting detection');
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
    
    console.log('🔍 Palm quality check:', {
        splayScore: splayScore.toFixed(2),
        thumbIndexGap: thumbIndexGap.toFixed(2),
        handSize: handSize.toFixed(2),
        palmVisibility: palmVisibility.toFixed(2)
    });
    
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
    console.log('📸 autoCapture called, isProcessing:', isProcessing, 'timeDiff:', now - lastCaptureTime);
    
    if (isProcessing) {
        console.log('❌ Already processing, skipping capture');
        return; // Already processing a capture
    }
    if (hasShownResult) {
        console.log('ℹ️ Result already shown, skip auto capture');
        return;
    }
    if (now - lastCaptureTime < 5000) {
        console.log('❌ Too soon since last capture, skipping');
        return; // Prevent too frequent captures
    }
    
    console.log('✅ Proceeding with auto capture');
    lastCaptureTime = now;
    
    // Fortune teller captures
    updateFortuneTellerSpeech("Đã chụp! Phân tích vận mệnh... 🔮", 0);
    
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
        console.error('Share error:', error);
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
    
    // Reset processing flags
    isProcessing = false;
    handDetected = false;
    lastCaptureTime = 0;
    hasShownResult = false;
    autoMode = true;
    mediaPipeFailed = false; // Reset MediaPipe failure flag
    
    // Reset camera status and create new button
    elements.cameraStatus.innerHTML = '<p>🔮 Đưa lòng bàn tay rõ ràng vào khung để tự động quét và bói</p>';
    
    // Remove any existing fallback buttons
    const existingFallbackBtn = document.getElementById('fallbackCaptureBtn');
    if (existingFallbackBtn) {
        existingFallbackBtn.remove();
    }
    
    // Fortune teller welcomes back
    updateFortuneTellerSpeech("Sẵn sàng cho lần bói tiếp theo! ✋", 5000);
    
    // Create new camera button (but don't show it, auto start camera)
    const newBtn = document.createElement('button');
    newBtn.id = 'startCameraBtn';
    newBtn.className = 'action-btn primary';
    newBtn.style.marginTop = '1rem';
    newBtn.style.display = 'none'; // Hide button, auto start camera
    newBtn.textContent = '🎥 Bật camera';
    newBtn.addEventListener('click', (e) => {
        console.log('🎥 New camera button clicked!', e);
        startCamera();
    });
    elements.cameraStatus.appendChild(newBtn);
    
    // Update elements reference
    elements.startCameraBtn = newBtn;
    console.log('✅ New camera button created and attached');
    
    // Restart camera for new reading
    stopCamera();
    setTimeout(() => {
        console.log('🔄 Restarting camera for new reading...');
        console.log('📊 Current flags:', { isProcessing, handDetected, hasShownResult, autoMode });
        startCamera();
    }, 1000);
}

// ================================
// EVENT LISTENERS
// ================================


// Upload area click (guard if upload area exists)
if (elements.uploadArea && elements.palmInput) {
    elements.uploadArea.addEventListener('click', (e) => {
        if (!e.target.closest('.remove-btn')) {
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
elements.fortuneBtn.addEventListener('click', getFortune);

// New reading button - simple full reload to avoid MediaPipe WASM issues
elements.newReadingBtn.addEventListener('click', () => {
    console.log('🔄 Reloading page for a fresh reading...');
    // Use location.reload(true) behavior: force reload from server if possible
    window.location.reload();
});

// Share button
elements.shareBtn.addEventListener('click', shareFortune);

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
    console.log('🔮 Mystical Fortune Teller initialized!');
    
    // Check if mobile
    if (isMobile()) {
        console.log('📱 Mobile device detected');
    }
    
    // Fortune teller greets on startup
    setTimeout(() => {
        if (isMobile()) {
            updateFortuneTellerSpeech("Chào bạn! Hãy chụp ảnh lòng bàn tay nhé! 📷✋", 3000);
        } else {
            updateFortuneTellerSpeech("Chào bạn! Đang khởi động camera... 🔮", 3000);
        }
    }, 500);
    
    // Check if mobile and use different approach
    if (isMobile()) {
        console.log('📱 Mobile detected - using file upload approach');
        showMobileUploadInterface();
    } else {
        console.log('💻 Desktop detected - using camera approach');
        // Auto start camera with delay to avoid conflicts
        setTimeout(() => {
            startCamera();
        }, 2000);
    }
    
    // Add some mystical console art
    console.log(`
    ╔═══════════════════════════════════════╗
    ║     🔮  THẦY BÓI THẦN THÁNH  🔮      ║
    ║                                       ║
    ║   Your destiny awaits in the stars   ║
    ║         and in your palm...          ║
    ╚═══════════════════════════════════════╝
    `);
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
        
        console.log('✨ 🎉 EASTER EGG ACTIVATED! You found the secret! 🎉 ✨');
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


