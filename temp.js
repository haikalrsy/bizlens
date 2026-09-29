
    document.addEventListener('DOMContentLoaded', () => {
      // URL Parameter for Title
      const urlParams = new URLSearchParams(window.location.search);
      const jenis = urlParams.get('jenis');
      const pageTitle = document.getElementById('page-title');
      if (jenis === 'kelayakan') {
        pageTitle.textContent = 'Analisis Kelayakan';
      } else if (jenis === 'kesehatan') {
        pageTitle.textContent = 'Analisis Kesehatan Bisnis';
      }

      const form = document.getElementById('wizard-form');
      const steps = [
        document.getElementById('step-1'),
        document.getElementById('step-2'),
        document.getElementById('step-3'),
        document.getElementById('step-4')
      ];
      const btnPrev = document.getElementById('btn-prev');
      const btnNext = document.getElementById('btn-next');
      const btnSubmit = document.getElementById('btn-submit');
      const progressFill = document.getElementById('progress-fill');
      
      let currentStep = 0;

      // Load data
      let editId = urlParams.get('edit');
      let initialData = {};
      
      if (editId) {
        const analyses = JSON.parse(localStorage.getItem('bizlens_analyses') || '[]');
        const existing = analyses.find(a => a.id === editId);
        if (existing) {
          initialData = existing;
          document.getElementById('page-title').textContent = 'Ubah Data Analisis';
        } else {
          editId = null;
        }
      } 
      
      if (!editId) {
        initialData = JSON.parse(localStorage.getItem('bizlens_draft') || '{}');
      }

      Object.keys(initialData).forEach(key => {
        const el = form.elements[key];
        if (el) el.value = initialData[key];
      });

      // Save draft on change (only if not editing)
      form.addEventListener('input', () => {
        if (!editId) {
          const formData = new FormData(form);
          const data = Object.fromEntries(formData.entries());
          localStorage.setItem('bizlens_draft', JSON.stringify(data));
        }
      });

      function updateUI() {
        // Steps visibility
        steps.forEach((step, index) => {
          step.classList.toggle('active', index === currentStep);
        });

        // Buttons
        btnPrev.classList.toggle('hidden', currentStep === 0);
        
        if (currentStep === steps.length - 1) {
          btnNext.classList.add('hidden');
          btnSubmit.classList.remove('hidden');
          populateConfirmation();
        } else {
          btnNext.classList.remove('hidden');
          btnSubmit.classList.add('hidden');
        }

        // Progress indicators
        for (let i = 0; i < 4; i++) {
          const indicator = document.getElementById(`indicator-${i + 1}`);
          const textSpan = indicator.parentElement.nextElementSibling.children[i];
          
          if (i < currentStep) {
            indicator.classList.add('completed');
            indicator.classList.remove('active');
            textSpan.classList.add('text-navy');
          } else if (i === currentStep) {
            indicator.classList.add('active');
            indicator.classList.remove('completed');
            textSpan.classList.add('text-navy');
          } else {
            indicator.classList.remove('active', 'completed');
            textSpan.classList.remove('text-navy');
          }
        }

        // Progress line fill
        progressFill.style.width = `${(currentStep / (steps.length - 1)) * 100}%`;
      }

      function formatRupiah(num) {
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num);
      }

      function populateConfirmation() {
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        
        document.getElementById('confirm-namaUsaha').textContent = data.namaUsaha || '-';
        document.getElementById('confirm-jenisUsaha').textContent = data.jenisUsaha || '-';
        document.getElementById('confirm-namaPemilik').textContent = data.namaPemilik || '-';
        
        document.getElementById('confirm-price').textContent = formatRupiah(data.price || 0);
        document.getElementById('confirm-cost').textContent = formatRupiah(data.cost || 0);
        document.getElementById('confirm-units').textContent = (data.units || 0) + ' Unit';
        document.getElementById('confirm-ops').textContent = formatRupiah(data.ops || 0);
        document.getElementById('confirm-modal').textContent = formatRupiah(data.modal || 0);
        
        document.getElementById('confirm-targetUnits').textContent = (data.targetUnits || 0) + ' Unit';
        document.getElementById('confirm-targetMargin').textContent = (data.targetMargin || 0) + '%';
        document.getElementById('confirm-targetBep').textContent = (data.targetBep || 0) + ' Bulan';
        document.getElementById('confirm-targetRoi').textContent = (data.targetRoi || 0) + '%';
      }

      function validateCurrentStep() {
        const currentStepEl = steps[currentStep];
        const inputs = currentStepEl.querySelectorAll('input, select, textarea');
        let isValid = true;

        inputs.forEach(input => {
          if (!input.checkValidity()) {
            isValid = false;
            input.classList.add('input-error');
            const errorMsg = input.nextElementSibling;
            if (errorMsg && errorMsg.classList.contains('error-msg')) {
              errorMsg.style.display = 'block';
            }
          } else {
            input.classList.remove('input-error');
            const errorMsg = input.nextElementSibling;
            if (errorMsg && errorMsg.classList.contains('error-msg')) {
              errorMsg.style.display = 'none';
            }
          }
        });

        return isValid;
      }

      // Input validation events
      form.addEventListener('input', (e) => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') {
          if (e.target.checkValidity()) {
            e.target.classList.remove('input-error');
            const errorMsg = e.target.nextElementSibling;
            if (errorMsg && errorMsg.classList.contains('error-msg')) {
              errorMsg.style.display = 'none';
            }
          }
        }
      });

      btnNext.addEventListener('click', () => {
        if (validateCurrentStep()) {
          if (currentStep < steps.length - 1) {
            currentStep++;
            updateUI();
          }
        }
      });

      btnPrev.addEventListener('click', () => {
        if (currentStep > 0) {
          currentStep--;
          updateUI();
        }
      });

      form.addEventListener('submit', (e) => {
        e.preventDefault();
        
        if (!validateCurrentStep()) return;

        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        
        // Parse numbers
        const numericFields = ['price', 'cost', 'units', 'ops', 'modal', 'targetUnits', 'targetMargin', 'targetBep', 'targetRoi'];
        numericFields.forEach(field => {
          data[field] = parseFloat(data[field]) || 0;
        });

        // Add metadata & Save
        const analyses = JSON.parse(localStorage.getItem('bizlens_analyses') || '[]');
        
        if (editId) {
          data.id = editId;
          data.createdAt = initialData.createdAt || new Date().toISOString();
          const idx = analyses.findIndex(a => a.id === editId);
          if (idx !== -1) {
            analyses[idx] = data;
          } else {
            analyses.push(data);
          }
        } else {
          data.id = Date.now().toString();
          data.createdAt = new Date().toISOString();
          analyses.push(data);
        }
        
        localStorage.setItem('bizlens_analyses', JSON.stringify(analyses));
        
        // Clear draft
        localStorage.removeItem('bizlens_draft');

        // Redirect
        window.location.href = `dashboard.html?id=${data.id}`;
      });

      updateUI();
    });
  