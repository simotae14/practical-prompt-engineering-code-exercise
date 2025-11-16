// Prompt Library Functionality
// Stores data in localStorage under a single key.
(function(){
	const STORAGE_KEY = 'promptLibrary.prompts';
	const form = document.getElementById('prompt-form');
	const titleInput = document.getElementById('prompt-title');
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
		const frag = document.createDocumentFragment();
		prompts.forEach(p => {
			// Backwards compatibility: ensure userRating field exists
			if (typeof p.userRating !== 'number') p.userRating = 0;
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
			card.appendChild(ratingWrap);
			card.appendChild(actions);
			frag.appendChild(card);
		});
		listEl.appendChild(frag);
	};

	const addPrompt = (title, content) => {
		const prompts = getPrompts();
		prompts.unshift({ id: Date.now(), title: title.trim(), content: content.trim(), userRating: 0 });
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
		const content = contentInput.value;
		if (!title.trim() || !content.trim()) {
			// Basic validation, rely on required attributes but ensure early exit.
			return;
		}
		addPrompt(title, content);
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
		if (target.classList.contains('star-btn')) {
			const id = target.dataset.id;
			const star = Number(target.dataset.star);
			if (!id || !star) return;
			setRating(id, star);
		}
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

	// Initial render
	document.addEventListener('DOMContentLoaded', renderPrompts);
})();
