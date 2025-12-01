// Prompt Library Functionality
// Stores data in localStorage under a single key.
(function(){
	const STORAGE_KEY = 'promptLibrary.prompts';

	// ===== METADATA TRACKING SYSTEM =====

	/**
	 * Estimate token count from text
	 * @param {string} text - The text to estimate tokens for
	 * @param {boolean} isCode - Whether the text is code
	 * @returns {Object} Token estimate with min, max, and confidence
	 */
	const estimateTokens = (text, isCode = false) => {
		if (typeof text !== 'string') {
			throw new Error('Text must be a string');
		}

		const words = text.trim().split(/\s+/).filter(Boolean);
		const wordCount = words.length;
		const charCount = text.length;

		// Base calculation
		let min = Math.round(0.75 * wordCount);
		let max = Math.round(0.25 * charCount);

		// Apply code multiplier
		if (isCode) {
			min = Math.round(min * 1.3);
			max = Math.round(max * 1.3);
		}

		// Determine confidence level
		const avgTokens = (min + max) / 2;
		let confidence;
		if (avgTokens < 1000) {
			confidence = 'high';
		} else if (avgTokens <= 5000) {
			confidence = 'medium';
		} else {
			confidence = 'low';
		}

		return { min, max, confidence };
	};

	/**
	 * Validate ISO 8601 date string
	 * @param {string} dateString - Date string to validate
	 * @returns {boolean} Whether the date is valid
	 */
	const isValidISODate = (dateString) => {
		if (typeof dateString !== 'string') return false;
		const date = new Date(dateString);
		return date instanceof Date && !isNaN(date.getTime()) && dateString === date.toISOString();
	};

	/**
	 * Track model metadata for a prompt
	 * @param {string} modelName - Name of the AI model
	 * @param {string} content - The prompt content
	 * @returns {Object} Metadata object with model, timestamps, and token estimate
	 */
	const trackModel = (modelName, content) => {
		// Validate model name
		if (typeof modelName !== 'string' || modelName.trim().length === 0) {
			throw new Error('Model name must be a non-empty string');
		}
		if (modelName.length > 100) {
			throw new Error('Model name must not exceed 100 characters');
		}

		// Validate content
		if (typeof content !== 'string') {
			throw new Error('Content must be a string');
		}

		const now = new Date().toISOString();
		const tokenEstimate = estimateTokens(content, false);

		return {
			model: modelName.trim(),
			createdAt: now,
			updatedAt: now,
			tokenEstimate
		};
	};

	/**
	 * Update timestamps in metadata
	 * @param {Object} metadata - Existing metadata object
	 * @returns {Object} Updated metadata object
	 */
	const updateTimestamps = (metadata) => {
		if (!metadata || typeof metadata !== 'object') {
			throw new Error('Metadata must be a valid object');
		}

		if (!metadata.createdAt || !isValidISODate(metadata.createdAt)) {
			throw new Error('Invalid createdAt timestamp in metadata');
		}

		const now = new Date().toISOString();
		const createdDate = new Date(metadata.createdAt);
		const updatedDate = new Date(now);

		if (updatedDate < createdDate) {
			throw new Error('updatedAt must be greater than or equal to createdAt');
		}

		return {
			...metadata,
			updatedAt: now
		};
	};

	/**
	 * Format date to human-readable string
	 * @param {string} isoString - ISO 8601 date string
	 * @returns {string} Formatted date string
	 */
	const formatDate = (isoString) => {
		try {
			const date = new Date(isoString);
			const now = new Date();
			const diffMs = now - date;
			const diffMins = Math.floor(diffMs / 60000);
			const diffHours = Math.floor(diffMs / 3600000);
			const diffDays = Math.floor(diffMs / 86400000);

			if (diffMins < 1) return 'just now';
			if (diffMins < 60) return `${diffMins}m ago`;
			if (diffHours < 24) return `${diffHours}h ago`;
			if (diffDays < 7) return `${diffDays}d ago`;

			return date.toLocaleDateString('en-US', { 
				month: 'short', 
				day: 'numeric', 
				year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined 
			});
		} catch (e) {
			return 'Invalid date';
		}
	};

	// ===== END METADATA TRACKING SYSTEM =====
	const form = document.getElementById('prompt-form');
	const titleInput = document.getElementById('prompt-title');
	const modelInput = document.getElementById('prompt-model');
	const contentInput = document.getElementById('prompt-content');
	const listEl = document.getElementById('prompt-list');
	const emptyStateEl = document.getElementById('empty-state');

	const getPrompts = () => {
		try {
			const raw = localStorage.getItem(STORAGE_KEY);
			return raw ? JSON.parse(raw) : [];
		} catch (e){
			console.warn('Failed to parse prompts from storage', e);
			return [];
		}
	};

	const savePrompts = (prompts) => {
		try { localStorage.setItem(STORAGE_KEY, JSON.stringify(prompts)); }
		catch (e){ console.error('Failed to save prompts', e); }
	};

	const wordPreview = (text, maxWords = 12) => {
		const words = text.trim().split(/\s+/).filter(Boolean);
		if (!words.length) return '(empty)';
		const slice = words.slice(0, maxWords).join(' ');
		return words.length > maxWords ? slice + '…' : slice;
	};

	const renderPrompts = () => {
		const prompts = getPrompts();
		listEl.innerHTML = '';
		if (!prompts.length){
			emptyStateEl.hidden = false;
			return;
		}
		emptyStateEl.hidden = true;
		
		// Sort by createdAt descending (newest first)
		const sortedPrompts = [...prompts].sort((a, b) => {
			const aDate = a.metadata?.createdAt || 0;
			const bDate = b.metadata?.createdAt || 0;
			return new Date(bDate) - new Date(aDate);
		});
		
		const frag = document.createDocumentFragment();
		sortedPrompts.forEach(p => {
			// Backwards compatibility: ensure userRating field exists
			if (typeof p.userRating !== 'number') p.userRating = 0;
			// Ensure notes array exists
			if (!Array.isArray(p.notes)) p.notes = [];
			const card = document.createElement('article');
			card.className = 'prompt-card';
			card.dataset.id = String(p.id);

			const title = document.createElement('h3');
			title.className = 'prompt-title';
			title.textContent = p.title || '(Untitled)';

			const preview = document.createElement('p');
			preview.className = 'prompt-preview';
			preview.textContent = wordPreview(p.content || '');

			// Rating component
			const ratingWrap = document.createElement('div');
			ratingWrap.className = 'rating';
			ratingWrap.setAttribute('role','radiogroup');
			ratingWrap.setAttribute('aria-label','Rate prompt effectiveness');
			ratingWrap.dataset.id = String(p.id);
			for (let i=1;i<=5;i++){
				const starBtn = document.createElement('button');
				starBtn.type = 'button';
				starBtn.className = 'star-btn' + (i <= p.userRating ? ' filled' : '');
				starBtn.textContent = '★';
				starBtn.dataset.star = String(i);
				starBtn.dataset.id = String(p.id);
				starBtn.setAttribute('role','radio');
				starBtn.setAttribute('aria-label', i + ' star' + (i === 1 ? '' : 's'));
				starBtn.setAttribute('aria-checked', i === p.userRating ? 'true' : 'false');
				starBtn.tabIndex = i === 1 ? 0 : -1;
				ratingWrap.appendChild(starBtn);
			}

			const actions = document.createElement('div');
			actions.className = 'card-actions';
			const deleteBtn = document.createElement('button');
			deleteBtn.type = 'button';
			deleteBtn.className = 'delete-btn';
			deleteBtn.textContent = 'DELETE';
			deleteBtn.setAttribute('aria-label', 'Delete prompt "' + (p.title || 'Untitled') + '"');
			deleteBtn.dataset.action = 'delete';
			deleteBtn.dataset.id = String(p.id);

			actions.appendChild(deleteBtn);
			card.appendChild(title);
			card.appendChild(preview);

			// Metadata Section
			if (p.metadata) {
				const metadataSection = document.createElement('div');
				metadataSection.className = 'metadata-section';

				// Model row
				const modelRow = document.createElement('div');
				modelRow.className = 'metadata-row';
				const modelLabel = document.createElement('span');
				modelLabel.className = 'metadata-label';
				modelLabel.textContent = 'Model:';
				const modelValue = document.createElement('span');
				modelValue.className = 'metadata-value metadata-model';
				modelValue.textContent = p.metadata.model;
				modelRow.appendChild(modelLabel);
				modelRow.appendChild(modelValue);
				metadataSection.appendChild(modelRow);

				// Created/Updated row
				const dateRow = document.createElement('div');
				dateRow.className = 'metadata-row';
				const dateLabel = document.createElement('span');
				dateLabel.className = 'metadata-label';
				dateLabel.textContent = 'Created:';
				const dateValue = document.createElement('span');
				dateValue.className = 'metadata-value metadata-date';
				dateValue.textContent = formatDate(p.metadata.createdAt);
				dateValue.title = new Date(p.metadata.createdAt).toLocaleString();
				dateRow.appendChild(dateLabel);
				dateRow.appendChild(dateValue);
				
				// Show updated if different from created
				if (p.metadata.updatedAt && p.metadata.updatedAt !== p.metadata.createdAt) {
					const updatedSpan = document.createElement('span');
					updatedSpan.className = 'metadata-value metadata-date';
					updatedSpan.textContent = ' (updated ' + formatDate(p.metadata.updatedAt) + ')';
					updatedSpan.title = new Date(p.metadata.updatedAt).toLocaleString();
					dateRow.appendChild(updatedSpan);
				}
				metadataSection.appendChild(dateRow);

				// Token estimate row
				if (p.metadata.tokenEstimate) {
					const tokenRow = document.createElement('div');
					tokenRow.className = 'metadata-row';
					const tokenLabel = document.createElement('span');
					tokenLabel.className = 'metadata-label';
					tokenLabel.textContent = 'Tokens:';
					const tokenEstimate = document.createElement('div');
					tokenEstimate.className = 'token-estimate';
					const tokenRange = document.createElement('span');
					tokenRange.className = 'token-range';
					tokenRange.textContent = `${p.metadata.tokenEstimate.min}-${p.metadata.tokenEstimate.max}`;
					const confidenceBadge = document.createElement('span');
					confidenceBadge.className = `confidence-badge confidence-${p.metadata.tokenEstimate.confidence}`;
					confidenceBadge.textContent = p.metadata.tokenEstimate.confidence;
					tokenEstimate.appendChild(tokenRange);
					tokenEstimate.appendChild(confidenceBadge);
					tokenRow.appendChild(tokenLabel);
					tokenRow.appendChild(tokenEstimate);
					metadataSection.appendChild(tokenRow);
				}

				card.appendChild(metadataSection);
			}

			card.appendChild(ratingWrap);

			// Notes Section
			const notesSection = document.createElement('div');
			notesSection.className = 'notes-section';
			const notesTitle = document.createElement('h4');
			notesTitle.className = 'notes-title';
			notesTitle.textContent = 'Notes';
			notesSection.appendChild(notesTitle);
			const notesList = document.createElement('ul');
			notesList.className = 'notes-list';
			notesList.dataset.id = String(p.id);
			if (!p.notes.length){
				const emptyLi = document.createElement('li');
				emptyLi.className = 'note-empty';
				emptyLi.textContent = 'No notes yet.';
				notesList.appendChild(emptyLi);
			} else {
				p.notes.forEach(n => {
					const li = document.createElement('li');
					li.className = 'note-item';
					li.dataset.noteId = String(n.id);
					const textSpan = document.createElement('span');
					textSpan.className = 'note-text';
					textSpan.textContent = n.text;
					li.appendChild(textSpan);
					const actionsWrap = document.createElement('div');
					actionsWrap.className = 'note-actions';
					const editBtn = document.createElement('button');
					editBtn.type = 'button';
					editBtn.className = 'note-btn edit-note-btn';
					editBtn.dataset.action = 'edit-note';
					editBtn.dataset.id = String(p.id);
					editBtn.dataset.noteId = String(n.id);
					editBtn.textContent = 'Edit';
					const deleteBtn = document.createElement('button');
					deleteBtn.type = 'button';
					deleteBtn.className = 'note-btn delete-note-btn';
					deleteBtn.dataset.action = 'delete-note';
					deleteBtn.dataset.id = String(p.id);
					deleteBtn.dataset.noteId = String(n.id);
					deleteBtn.textContent = 'Delete';
					actionsWrap.appendChild(editBtn);
					actionsWrap.appendChild(deleteBtn);
					li.appendChild(actionsWrap);
					notesList.appendChild(li);
				});
			}
			notesSection.appendChild(notesList);
			const addForm = document.createElement('form');
			addForm.className = 'add-note-form';
			addForm.dataset.id = String(p.id);
			addForm.innerHTML = '<label class="visually-hidden" for="note-input-'+p.id+'">Add note</label>' +
				'<input id="note-input-'+p.id+'" name="note" type="text" maxlength="300" placeholder="Add a note..." required />' +
				'<button type="submit" class="note-add-btn">Add</button>';
			notesSection.appendChild(addForm);
			card.appendChild(notesSection);

			card.appendChild(actions);
			frag.appendChild(card);
		});
		listEl.appendChild(frag);
	};

	const addPrompt = (title, content, modelName) => {
		const prompts = getPrompts();
		
		// Create metadata for the prompt
		let metadata = null;
		try {
			metadata = trackModel(modelName, content);
		} catch (error) {
			console.error('Failed to create metadata:', error);
			alert('Error: ' + error.message);
			return;
		}
		
		prompts.unshift({ 
			id: Date.now(), 
			title: title.trim(), 
			content: content.trim(), 
			userRating: 0,
			metadata: metadata
		});
		savePrompts(prompts);
		renderPrompts();
	};

	const deletePrompt = (id) => {
		const prompts = getPrompts();
		const next = prompts.filter(p => String(p.id) !== String(id));
		savePrompts(next);
		renderPrompts();
	};

	// Form submit handler
	form.addEventListener('submit', (e) => {
		e.preventDefault();
		const title = titleInput.value;
		const model = modelInput.value;
		const content = contentInput.value;
		if (!title.trim() || !model.trim() || !content.trim()) {
			// Basic validation, rely on required attributes but ensure early exit.
			return;
		}
		addPrompt(title, content, model);
		form.reset();
		titleInput.focus();
	});

	// Event delegation for delete buttons
	// Event delegation for delete & rating
	listEl.addEventListener('click', (e) => {
		const target = e.target;
		if (!(target instanceof HTMLElement)) return;
		if (target.dataset.action === 'delete') {
			const id = target.dataset.id;
			deletePrompt(id);
			return;
		}
		// Delete note
		if (target.dataset.action === 'delete-note') {
			deleteNote(target.dataset.id, target.dataset.noteId);
			return;
		}
		// Edit note -> switch to inline edit state
		if (target.dataset.action === 'edit-note') {
			enterEditMode(target.dataset.id, target.dataset.noteId);
			return;
		}
		// Save edited note
		if (target.dataset.action === 'save-note') {
			const id = target.dataset.id;
			const noteId = target.dataset.noteId;
			const wrapper = target.closest('.note-item');
			const textarea = wrapper?.querySelector('textarea');
			if (textarea && textarea.value.trim()) {
				updateNote(id, noteId, textarea.value.trim());
			}
			return;
		}
		// Cancel edit -> re-render
		if (target.dataset.action === 'cancel-edit-note') {
			renderPrompts();
			return;
		}
		if (target.classList.contains('star-btn')) {
			const id = target.dataset.id;
			const star = Number(target.dataset.star);
			if (!id || !star) return;
			setRating(id, star);
		}
	});

	// Add note form submission (delegated)
	listEl.addEventListener('submit', (e) => {
		const formEl = e.target;
		if (!(formEl instanceof HTMLFormElement)) return;
		if (!formEl.classList.contains('add-note-form')) return;
		e.preventDefault();
		const id = formEl.dataset.id;
		const input = formEl.querySelector('input[name="note"]');
		if (!id || !(input instanceof HTMLInputElement)) return;
		const value = input.value.trim();
		if (!value) return;
		addNote(id, value);
		formEl.reset();
	});

	// Keyboard navigation for rating (left/right arrows)
	listEl.addEventListener('keydown', (e) => {
		const target = e.target;
		if (!(target instanceof HTMLElement) || !target.classList.contains('star-btn')) return;
		if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
		const id = target.dataset.id;
		const current = Number(target.dataset.star);
		if (!id || !current) return;
		let next = current;
		if (e.key === 'ArrowRight') next = Math.min(5, current + 1);
		else if (e.key === 'ArrowLeft') next = Math.max(1, current - 1);
		if (next !== current) {
			setRating(id, next);
			// Move focus to new star after re-render
			requestAnimationFrame(() => {
				const card = listEl.querySelector('.prompt-card[data-id="' + id + '"]');
				const newStar = card?.querySelector('.star-btn[data-star="' + next + '"]');
				newStar?.focus();
			});
		}
	});

	const setRating = (id, value) => {
		if (value < 1 || value > 5) return;
		const prompts = getPrompts();
		const prompt = prompts.find(p => String(p.id) === String(id));
		if (!prompt) return;
		prompt.userRating = value;
		savePrompts(prompts);
		renderPrompts();
	};

	// Notes CRUD helpers
	const addNote = (promptId, text) => {
		const prompts = getPrompts();
		const prompt = prompts.find(p => String(p.id) === String(promptId));
		if (!prompt) return;
		if (!Array.isArray(prompt.notes)) prompt.notes = [];
		prompt.notes.unshift({ id: Date.now(), text, updatedAt: Date.now() });
		savePrompts(prompts);
		renderPrompts();
	};

	const deleteNote = (promptId, noteId) => {
		if (!promptId || !noteId) return;
		const prompts = getPrompts();
		const prompt = prompts.find(p => String(p.id) === String(promptId));
		if (!prompt || !Array.isArray(prompt.notes)) return;
		prompt.notes = prompt.notes.filter(n => String(n.id) !== String(noteId));
		savePrompts(prompts);
		renderPrompts();
	};

	const updateNote = (promptId, noteId, text) => {
		const prompts = getPrompts();
		const prompt = prompts.find(p => String(p.id) === String(promptId));
		if (!prompt || !Array.isArray(prompt.notes)) return;
		const note = prompt.notes.find(n => String(n.id) === String(noteId));
		if (!note) return;
		note.text = text;
		note.updatedAt = Date.now();
		savePrompts(prompts);
		renderPrompts();
	};

	const enterEditMode = (promptId, noteId) => {
		const card = listEl.querySelector('.prompt-card[data-id="'+promptId+'"]');
		const li = card?.querySelector('.note-item[data-note-id="'+noteId+'"]');
		if (!li) return;
		const textEl = li.querySelector('.note-text');
		if (!textEl) return;
		const original = textEl.textContent || '';
		li.innerHTML = '';
		const textarea = document.createElement('textarea');
		textarea.className = 'note-edit';
		textarea.value = original;
		textarea.rows = 3;
		li.appendChild(textarea);
		const actions = document.createElement('div');
		actions.className = 'note-actions';
		const saveBtn = document.createElement('button');
		saveBtn.type = 'button';
		saveBtn.className = 'note-btn save-note-btn';
		saveBtn.dataset.action = 'save-note';
		saveBtn.dataset.id = String(promptId);
		saveBtn.dataset.noteId = String(noteId);
		saveBtn.textContent = 'Save';
		const cancelBtn = document.createElement('button');
		cancelBtn.type = 'button';
		cancelBtn.className = 'note-btn cancel-note-btn';
		cancelBtn.dataset.action = 'cancel-edit-note';
		cancelBtn.textContent = 'Cancel';
		actions.appendChild(saveBtn);
		actions.appendChild(cancelBtn);
		li.appendChild(actions);
		textarea.focus();
	};

	// Initial render
	document.addEventListener('DOMContentLoaded', renderPrompts);
})();
