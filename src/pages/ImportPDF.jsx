// This page is accessible via /import but the primary entry point is the
// "Import Report Card PDF" button inside the IB Progress History section on the Dashboard.
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function ImportPDF() {
  const navigate = useNavigate();
  useEffect(() => { navigate('/', { replace: true }); }, [navigate]);
  return null;
}
