from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from io import BytesIO
from datetime import datetime
from sqlalchemy.orm import Session
from ..models import Session as SessionModel, Attendance, Personnel, FireStation, DIENSTGRADE
import os

class PDFGenerator:
    @staticmethod
    def generate_session_pdf(db: Session, session_id: int) -> bytes:
        """Generate PDF report for a session"""
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4, leftMargin=2*cm, rightMargin=2*cm,
                               topMargin=2*cm, bottomMargin=2*cm)
        
        # Get session data
        session = db.query(SessionModel).filter(SessionModel.id == session_id).first()
        if not session:
            return None
        
        # Get fire station settings
        fire_station = db.query(FireStation).first()
        
        # Get attendances
        attendances = db.query(Attendance).filter(
            Attendance.session_id == session_id
        ).all()
        
        story = []
        styles = getSampleStyleSheet()
        
        # Add logo if available
        if fire_station and fire_station.logo_path and os.path.exists(fire_station.logo_path):
            try:
                logo = Image(fire_station.logo_path, width=4*cm, height=4*cm)
                logo.hAlign = 'CENTER'
                story.append(logo)
                story.append(Spacer(1, 0.5*cm))
            except:
                pass
        
        # Title
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=18,
            textColor=colors.HexColor('#8B0000'),
            spaceAfter=30,
            alignment=TA_CENTER
        )
        
        if fire_station:
            title = Paragraph(f"<b>{fire_station.name}</b>", title_style)
            story.append(title)
        
        # Session information
        info_style = styles['Normal']
        story.append(Paragraph(f"<b>Anwesenheitsliste</b>", styles['Heading2']))
        story.append(Spacer(1, 0.3*cm))
        
        story.append(Paragraph(f"<b>Event-Typ:</b> {session.event_type}", info_style))
        story.append(Paragraph(f"<b>Beginn:</b> {session.started_at.strftime('%d.%m.%Y %H:%M') if session.started_at else 'N/A'}", info_style))
        if session.ended_at:
            story.append(Paragraph(f"<b>Ende:</b> {session.ended_at.strftime('%d.%m.%Y %H:%M')}", info_style))
        else:
            story.append(Paragraph(f"<b>Status:</b> Aktiv", info_style))
        
        story.append(Spacer(1, 0.5*cm))
        
        # Attendance table
        story.append(Paragraph("<b>Teilnehmer</b>", styles['Heading2']))
        story.append(Spacer(1, 0.3*cm))
        
        table_data = [['Nr.', 'Stammr.', 'Name', 'Dienstgrad', 'Check-in', 'Check-out']]
        
        for idx, att in enumerate(attendances, 1):
            personnel = att.personnel
            dienstgrad_info = DIENSTGRADE.get(personnel.dienstgrad, (personnel.dienstgrad, 0))
            table_data.append([
                str(idx),
                personnel.stammrollennummer,
                f"{personnel.vorname} {personnel.nachname}",
                dienstgrad_info[0],
                att.checked_in_at.strftime('%H:%M') if att.checked_in_at else '',
                att.checked_out_at.strftime('%H:%M') if att.checked_out_at else '-'
            ])
        
        table = Table(table_data, colWidths=[1*cm, 2*cm, 5*cm, 4*cm, 2*cm, 2*cm])
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#8B0000')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 10),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 1), (-1, -1), 9),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ]))
        
        story.append(table)
        story.append(Spacer(1, 1*cm))
        
        # Signature field
        story.append(Paragraph("<b>Unterschrift Einsatzleiter:</b>", info_style))
        story.append(Spacer(1, 1.5*cm))
        story.append(Paragraph("_" * 50, info_style))
        
        doc.build(story)
        buffer.seek(0)
        return buffer.getvalue()
