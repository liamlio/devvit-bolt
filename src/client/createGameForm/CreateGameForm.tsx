import React, { useState, useEffect } from 'react';
import './CreateGameForm.css';

interface Statement {
  text: string;
  description?: string;
}

interface FormData {
  truth1: Statement;
  truth2: Statement;
  lie: Statement;
}

interface InitialData {
  postId: string;
  userId: string;
  authorUsername: string;
}

const CHARACTER_LIMITS = {
  statement: 100,
  description: 1000,
};

export const CreateGameForm: React.FC = () => {
  const [formData, setFormData] = useState<FormData>({
    truth1: { text: '', description: '' },
    truth2: { text: '', description: '' },
    lie: { text: '' },
  });

  const [errors, setErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [initialData, setInitialData] = useState<InitialData | null>(null);

  useEffect(() => {
    // Listen for messages from parent Devvit app
    const handleMessage = (event: MessageEvent) => {
      console.log('Received message in webview:', event.data);
      
      // Handle messages from Devvit (they come wrapped in devvit-message)
      if (event.data.type === 'devvit-message') {
        const message = event.data.message;
        if (message.type === 'INIT_DATA') {
          console.log('Setting initial data:', message.data);
          setInitialData(message.data);
        }
      }
    };

    window.addEventListener('message', handleMessage);
    
    // Send ready message to parent Devvit app
    const sendReadyMessage = () => {
      console.log('Sending webViewReady message to parent');
      window.parent.postMessage({ type: 'webViewReady' }, '*');
    };

    // Send ready message after a short delay to ensure parent is listening
    setTimeout(sendReadyMessage, 100);

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  const validateForm = (): string[] => {
    const newErrors: string[] = [];

    // Validate truth1
    if (!formData.truth1.text.trim()) {
      newErrors.push('Truth #1 is required');
    } else if (formData.truth1.text.length > CHARACTER_LIMITS.statement) {
      newErrors.push(`Truth #1 exceeds ${CHARACTER_LIMITS.statement} character limit`);
    }

    // Validate truth1 description
    if (formData.truth1.description && formData.truth1.description.length > CHARACTER_LIMITS.description) {
      newErrors.push(`Truth #1 details exceed ${CHARACTER_LIMITS.description} character limit`);
    }

    // Validate truth2
    if (!formData.truth2.text.trim()) {
      newErrors.push('Truth #2 is required');
    } else if (formData.truth2.text.length > CHARACTER_LIMITS.statement) {
      newErrors.push(`Truth #2 exceeds ${CHARACTER_LIMITS.statement} character limit`);
    }

    // Validate truth2 description
    if (formData.truth2.description && formData.truth2.description.length > CHARACTER_LIMITS.description) {
      newErrors.push(`Truth #2 details exceed ${CHARACTER_LIMITS.description} character limit`);
    }

    // Validate lie
    if (!formData.lie.text.trim()) {
      newErrors.push('The lie is required');
    } else if (formData.lie.text.length > CHARACTER_LIMITS.statement) {
      newErrors.push(`The lie exceeds ${CHARACTER_LIMITS.statement} character limit`);
    }

    return newErrors;
  };

  // Handle button click instead of form submission
  const handleCreateGame = async (event: React.MouseEvent<HTMLButtonElement>) => {
    // Prevent any default behavior
    event.preventDefault();
    event.stopPropagation();
    
    const validationErrors = validateForm();
    setErrors(validationErrors);

    if (validationErrors.length > 0) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Clean up form data
      const cleanFormData = {
        truth1: {
          text: formData.truth1.text.trim(),
          description: formData.truth1.description?.trim() || undefined,
        },
        truth2: {
          text: formData.truth2.text.trim(),
          description: formData.truth2.description?.trim() || undefined,
        },
        lie: {
          text: formData.lie.text.trim(),
        },
      };

      console.log('Submitting form data to parent:', cleanFormData);

      // Send data back to parent Devvit app
      window.parent.postMessage({
        type: 'CREATE_GAME_SUBMIT',
        data: cleanFormData
      }, '*');

    } catch (error) {
      console.error('Error submitting form:', error);
      setErrors(['An error occurred while submitting the form. Please try again.']);
      setIsSubmitting(false);
    }
  };

  const updateFormField = (field: keyof FormData, subfield: 'text' | 'description', value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: {
        ...prev[field],
        [subfield]: value,
      }
    }));
    
    // Clear errors when user starts typing
    if (errors.length > 0) {
      setErrors([]);
    }
  };

  const getCharacterCount = (text: string, limit: number) => {
    const isOverLimit = text.length > limit;
    return (
      <span className={`character-count ${isOverLimit ? 'over-limit' : ''}`}>
        {text.length}/{limit}
      </span>
    );
  };

  // Handle Enter key in textareas to prevent any form submission
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      handleCreateGame(event as any);
    }
  };

  return (
    <div className="create-game-form">
      <div className="form-header">
        <h1>🎪 Create Your Two Truths One Lie Game</h1>
        <p>Create two true statements and one lie. Players will try to guess which statement is false!</p>
        {initialData && (
          <p className="user-info">Creating as: u/{initialData.authorUsername}</p>
        )}
      </div>

      {errors.length > 0 && (
        <div className="error-container">
          <h3>Please fix these issues:</h3>
          <ul>
            {errors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Use div instead of form to prevent any form submission */}
      <div className="game-form" onKeyDown={handleKeyDown}>
        {/* Truth #1 */}
        <div className="form-group">
          <label htmlFor="truth1">
            Truth #1 ✅
            {getCharacterCount(formData.truth1.text, CHARACTER_LIMITS.statement)}
          </label>
          <textarea
            id="truth1"
            value={formData.truth1.text}
            onChange={(e) => updateFormField('truth1', 'text', e.target.value)}
            placeholder="Enter your first true statement..."
            rows={3}
          />
        </div>

        <div className="form-group">
          <label htmlFor="truth1Description">
            Truth #1 Details (Optional)
            {getCharacterCount(formData.truth1.description || '', CHARACTER_LIMITS.description)}
          </label>
          <textarea
            id="truth1Description"
            value={formData.truth1.description || ''}
            onChange={(e) => updateFormField('truth1', 'description', e.target.value)}
            placeholder="Color in the details if you want to give more context on your truth..."
            rows={2}
          />
        </div>

        {/* Truth #2 */}
        <div className="form-group">
          <label htmlFor="truth2">
            Truth #2 ✅
            {getCharacterCount(formData.truth2.text, CHARACTER_LIMITS.statement)}
          </label>
          <textarea
            id="truth2"
            value={formData.truth2.text}
            onChange={(e) => updateFormField('truth2', 'text', e.target.value)}
            placeholder="Enter your second true statement..."
            rows={3}
          />
        </div>

        <div className="form-group">
          <label htmlFor="truth2Description">
            Truth #2 Details (Optional)
            {getCharacterCount(formData.truth2.description || '', CHARACTER_LIMITS.description)}
          </label>
          <textarea
            id="truth2Description"
            value={formData.truth2.description || ''}
            onChange={(e) => updateFormField('truth2', 'description', e.target.value)}
            placeholder="Color in the details if you want to give more context on your truth..."
            rows={2}
          />
        </div>

        {/* Lie */}
        <div className="form-group">
          <label htmlFor="lie">
            The Lie ❌
            {getCharacterCount(formData.lie.text, CHARACTER_LIMITS.statement)}
          </label>
          <textarea
            id="lie"
            value={formData.lie.text}
            onChange={(e) => updateFormField('lie', 'text', e.target.value)}
            placeholder="Enter your convincing lie..."
            rows={3}
          />
        </div>

        <div className="form-actions">
          {/* Use button with onClick instead of form submission */}
          <button
            type="button"
            onClick={handleCreateGame}
            disabled={isSubmitting}
            className="submit-button"
          >
            {isSubmitting ? 'Creating Game...' : 'Create Game! 🎪'}
          </button>
        </div>
      </div>

      <div className="form-footer">
        <p>💡 <strong>Tips:</strong></p>
        <ul>
          <li>Make your truths surprising but believable</li>
          <li>Craft a lie that sounds plausible</li>
          <li>Use details to make truths more convincing</li>
        </ul>
      </div>
    </div>
  );
};