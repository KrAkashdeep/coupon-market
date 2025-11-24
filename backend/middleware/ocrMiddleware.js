const Tesseract = require('tesseract.js');

/**
 * Middleware to process OCR on uploaded coupon screenshot
 * Extracts text from the image URL and stores it in req.ocrData
 */
const processOCR = async (req, res, next) => {
    let worker = null;

    try {
        // Check if Cloudinary URL exists
        if (!req.cloudinaryResult || !req.cloudinaryResult.url) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Image URL not found. Upload image first.'
                }
            });
        }

        const imageUrl = req.cloudinaryResult.url;

        console.log('Starting OCR processing for image:', imageUrl);

        // Create a worker instance
        worker = await Tesseract.createWorker('eng', 1, {
            logger: (m) => {
                // Log progress for debugging
                if (m.status === 'recognizing text') {
                    console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
                }
            }
        });

        // Process image with Tesseract.js
        const { data } = await worker.recognize(imageUrl);

        // Extract the recognized text
        const extractedText = data.text.trim();

        console.log('OCR extraction completed. Text length:', extractedText.length);

        // Store OCR results in request object
        req.ocrData = {
            extractedText: extractedText,
            confidence: data.confidence
        };

        // Terminate the worker
        await worker.terminate();

        next();
    } catch (error) {
        console.error('OCR processing error:', error);

        // Terminate worker if it exists
        if (worker) {
            try {
                await worker.terminate();
            } catch (terminateError) {
                console.error('Error terminating worker:', terminateError);
            }
        }

        // Don't fail the request if OCR fails, just log and continue
        // Set status to pending_verification for manual admin review
        req.ocrData = {
            extractedText: '',
            confidence: 0,
            error: error.message
        };

        // Continue to next middleware
        next();
    }
};

/**
 * Middleware to compare entered coupon code with OCR extracted text
 * Sets isOCRMatched flag based on comparison result
 */
const compareCode = (req, res, next) => {
    try {
        // Get the entered coupon code from request body
        const enteredCode = req.body.code;

        if (!enteredCode) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Coupon code is required'
                }
            });
        }

        // Get OCR extracted text
        const extractedText = req.ocrData?.extractedText || '';

        // Normalize both strings for comparison
        // Remove whitespace, convert to uppercase for case-insensitive matching
        const normalizedCode = enteredCode.replace(/\s+/g, '').toUpperCase();
        const normalizedExtractedText = extractedText.replace(/\s+/g, '').toUpperCase();

        // Check if the entered code exists in the extracted text
        const isMatched = normalizedExtractedText.includes(normalizedCode);

        console.log('Code comparison:');
        console.log('  Entered code:', enteredCode);
        console.log('  Normalized code:', normalizedCode);
        console.log('  Extracted text length:', extractedText.length);
        console.log('  Match result:', isMatched);

        // Store comparison result in request object
        req.ocrComparison = {
            isOCRMatched: isMatched,
            enteredCode: enteredCode,
            extractedText: extractedText
        };

        next();
    } catch (error) {
        console.error('Code comparison error:', error);

        // Set default values if comparison fails
        req.ocrComparison = {
            isOCRMatched: false,
            enteredCode: req.body.code || '',
            extractedText: req.ocrData?.extractedText || '',
            error: error.message
        };

        next();
    }
};

module.exports = {
    processOCR,
    compareCode
};
