document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('applicationForm');
    const imageUpload = document.getElementById('imageUpload');
    const imgUploadedBtn = document.getElementById('imgUploadedBtn');
    const previewArea = document.getElementById('previewArea');
    const imagePreview = document.getElementById('imagePreview');
    const errorMessage = document.getElementById('error-message');
    const successMessage = document.getElementById('success-message');
    const submitBtn = document.getElementById('submitBtn');

    let uploadedFilename = null;

    // Handle file selection
    imageUpload.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        errorMessage.classList.add('hidden');
        successMessage.classList.add('hidden');
        imgUploadedBtn.classList.add('hidden');
        previewArea.classList.add('hidden');
        uploadedFilename = null;

        if (!file) return;

        // Validate file type
        if (!['image/jpeg', 'image/jpg'].includes(file.type)) {
            showError('Only JPEG images are allowed.');
            imageUpload.value = ''; // clear input
            return;
        }

        // Upload the image
        const formData = new FormData();
        formData.append('image', file);

        try {
            submitBtn.disabled = true;
            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            });
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Upload failed');
            }

            uploadedFilename = data.filename;
            
            // Show "Image Uploaded" button indicating success
            imgUploadedBtn.classList.remove('hidden');
            
            // Create local preview URL
            const previewUrl = URL.createObjectURL(file);
            imagePreview.src = previewUrl;
            
        } catch (error) {
            showError(error.message);
            imageUpload.value = '';
        } finally {
            submitBtn.disabled = false;
        }
    });

    // Handle clicking "Image Uploaded"
    imgUploadedBtn.addEventListener('click', () => {
        if (imagePreview.src) {
            previewArea.classList.remove('hidden');
        }
    });

    // Handle form submission
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const name = document.getElementById('name').value.trim();
        
        if (!name) {
            showError('Name cannot be empty.');
            return;
        }
        
        if (!uploadedFilename) {
            showError('Please wait for the image to upload or select a valid JPEG image.');
            return;
        }

        try {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Submitting...';
            
            const response = await fetch('/api/submit', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ name, filename: uploadedFilename })
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Submission failed');
            }
            
            successMessage.textContent = 'Application submitted! Downloading PDF...';
            successMessage.classList.remove('hidden');
            form.reset();
            imgUploadedBtn.classList.add('hidden');
            previewArea.classList.add('hidden');
            uploadedFilename = null;
            
            // Automatically trigger PDF download
            if (data.pdfUrl) {
                window.location.href = data.pdfUrl;
            }
            
        } catch (error) {
            showError(error.message);
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Submit';
        }
    });

    function showError(msg) {
        errorMessage.textContent = msg;
        errorMessage.classList.remove('hidden');
    }
});
