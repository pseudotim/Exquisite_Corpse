  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/png')) { alert('Please upload a PNG file'); return; }
    const role = adminMode ? adminCurrentRole : myRole;
    const template = { head: { width: 850, height: 402 }, torso: { width: 850, height: 402 }, legs: { width: 850, height: 366 } }[role];
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        if (img.width !== template.width || img.height !== template.height) {
          alert(`Wrong image size! Expected ${template.width}×${template.height}px but got ${img.width}×${img.height}px.`);
          return;
        }
        setUploadedImage(ev.target.result);
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  };
