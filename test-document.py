#!/usr/bin/env python3
"""
Simple test script to create a sample PDF for testing document processing
"""

from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
import os

def create_test_pdf():
    filename = "test_medical_document.pdf"
    c = canvas.Canvas(filename, pagesize=letter)
    
    # Add some medical-looking content
    c.drawString(100, 750, "SAMPLE MEDICAL DOCUMENT")
    c.drawString(100, 720, "Patient: John Doe")
    c.drawString(100, 700, "DOB: 01/01/1980")
    c.drawString(100, 680, "MRN: 123456789")
    c.drawString(100, 650, "")
    c.drawString(100, 620, "CHIEF COMPLAINT:")
    c.drawString(120, 600, "Chest pain for 2 days")
    c.drawString(100, 570, "")
    c.drawString(100, 540, "VITAL SIGNS:")
    c.drawString(120, 520, "BP: 140/90 mmHg")
    c.drawString(120, 500, "HR: 88 bpm")
    c.drawString(120, 480, "Temp: 98.6°F")
    c.drawString(120, 460, "RR: 16")
    c.drawString(120, 440, "O2 Sat: 98%")
    
    c.save()
    print(f"Created test PDF: {filename}")

if __name__ == "__main__":
    create_test_pdf()