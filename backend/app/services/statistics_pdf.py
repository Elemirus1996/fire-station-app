from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.graphics.shapes import Drawing
from reportlab.graphics.charts.barcharts import VerticalBarChart
from reportlab.graphics.charts.linecharts import HorizontalLineChart
from io import BytesIO
from datetime import datetime
from sqlalchemy.orm import Session
from ..models import Personnel, Attendance, Session as SessionModel, FireStation

class StatisticsPDFGenerator:
    @staticmethod
    def generate_personnel_yearly_pdf(db: Session, personnel_id: int, year: int, stats_data: dict) -> bytes:
        """Generate yearly statistics PDF for a personnel"""
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4, leftMargin=2*cm, rightMargin=2*cm,
                               topMargin=2*cm, bottomMargin=2*cm)
        
        story = []
        styles = getSampleStyleSheet()
        
        # Title
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=24,
            textColor=colors.HexColor('#B91C1C'),
            spaceAfter=30,
            alignment=TA_CENTER
        )
        
        title = Paragraph(f"Jahresstatistik {year}", title_style)
        story.append(title)
        
        # Personnel info
        personnel = stats_data['personnel']
        info_text = f"""
        <b>Name:</b> {personnel['vorname']} {personnel['nachname']}<br/>
        <b>Dienstgrad:</b> {personnel['dienstgrad']}<br/>
        <b>Stammrollennummer:</b> {personnel['stammrollennummer']}<br/>
        """
        info = Paragraph(info_text, styles['Normal'])
        story.append(info)
        story.append(Spacer(1, 0.5*cm))
        
        # Summary statistics
        story.append(Paragraph("<b>Zusammenfassung</b>", styles['Heading2']))
        
        summary = stats_data['summary']
        summary_data = [
            ['Gesamtteilnahmen', str(summary['total_sessions'])],
            ['Gesamtstunden', f"{summary['total_hours']}h"],
            ['Anwesenheitsquote', f"{summary['attendance_rate']}%"],
        ]
        
        summary_table = Table(summary_data, colWidths=[10*cm, 7*cm])
        summary_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#F3F4F6')),
            ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 12),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
            ('GRID', (0, 0), (-1, -1), 1, colors.grey),
        ]))
        story.append(summary_table)
        story.append(Spacer(1, 0.5*cm))
        
        # Event types with details
        story.append(Paragraph("<b>Teilnahme nach Event-Typ</b>", styles['Heading2']))
        
        if 'event_type_details' in summary:
            event_data = [['Event-Typ', 'Besucht', 'Gesamt im Jahr', 'Quote']]
            for event_type, details in summary['event_type_details'].items():
                event_data.append([
                    event_type,
                    str(details['attended']),
                    str(details['total']),
                    f"{details['rate']}%"
                ])
        else:
            # Fallback for old data format
            event_data = [['Event-Typ', 'Anzahl']]
            for event_type, count in summary['event_types'].items():
                event_data.append([event_type, str(count)])
        
        event_table = Table(event_data, colWidths=[7*cm, 3.5*cm, 3.5*cm, 3*cm] if 'event_type_details' in summary else [10*cm, 7*cm])
        event_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#B91C1C')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 11),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
            ('GRID', (0, 0), (-1, -1), 1, colors.grey),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#F9FAFB')]),
        ]))
        story.append(event_table)
        story.append(Spacer(1, 0.5*cm))
        
        # Monthly breakdown
        story.append(Paragraph("<b>Monatliche Übersicht</b>", styles['Heading2']))
        monthly_data = [['Monat', 'Teilnahmen', 'Stunden']]
        for month in stats_data['monthly']:
            monthly_data.append([
                month['month_name'],
                str(month['count']),
                f"{month['hours']}h"
            ])
        
        monthly_table = Table(monthly_data, colWidths=[8*cm, 5*cm, 4*cm])
        monthly_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#B91C1C')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('GRID', (0, 0), (-1, -1), 1, colors.grey),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#F9FAFB')]),
        ]))
        story.append(monthly_table)
        
        # Footer
        story.append(Spacer(1, 1*cm))
        footer_text = f"Erstellt am {datetime.now().strftime('%d.%m.%Y um %H:%M Uhr')}"
        footer = Paragraph(footer_text, styles['Normal'])
        story.append(footer)
        
        # Build PDF
        doc.build(story)
        buffer.seek(0)
        return buffer.getvalue()
    
    @staticmethod
    def generate_unit_yearly_pdf(db: Session, year: int, stats_data: dict) -> bytes:
        """Generate yearly statistics PDF for entire unit"""
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4, leftMargin=2*cm, rightMargin=2*cm,
                               topMargin=2*cm, bottomMargin=2*cm)
        
        story = []
        styles = getSampleStyleSheet()
        
        # Title
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=24,
            textColor=colors.HexColor('#B91C1C'),
            spaceAfter=30,
            alignment=TA_CENTER
        )
        
        title = Paragraph(f"Jahresbericht {year} - Gesamteinheit", title_style)
        story.append(title)
        
        # Summary statistics
        story.append(Paragraph("<b>Zusammenfassung</b>", styles['Heading2']))
        
        summary = stats_data['summary']
        summary_data = [
            ['Gesamt Sessions', str(summary['total_sessions'])],
            ['Gesamt Teilnahmen', str(summary['total_attendances'])],
            ['Ø Teilnahme pro Session', f"{summary['average_attendance_per_session']}"],
        ]
        
        summary_table = Table(summary_data, colWidths=[10*cm, 7*cm])
        summary_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#F3F4F6')),
            ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 12),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
            ('GRID', (0, 0), (-1, -1), 1, colors.grey),
        ]))
        story.append(summary_table)
        story.append(Spacer(1, 0.5*cm))
        
        # Event types
        story.append(Paragraph("<b>Sessions nach Typ</b>", styles['Heading2']))
        event_data = [['Event-Typ', 'Anzahl']]
        for event_type, count in summary['event_types'].items():
            event_data.append([event_type, str(count)])
        
        event_table = Table(event_data, colWidths=[10*cm, 7*cm])
        event_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#B91C1C')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 11),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
            ('GRID', (0, 0), (-1, -1), 1, colors.grey),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#F9FAFB')]),
        ]))
        story.append(event_table)
        story.append(Spacer(1, 0.5*cm))
        
        # Top personnel
        story.append(PageBreak())
        story.append(Paragraph("<b>Top 10 aktivste Mitglieder</b>", styles['Heading2']))
        
        top_data = [['Rang', 'Name', 'Dienstgrad', 'Teilnahmen', 'Quote']]
        for idx, person in enumerate(stats_data['top_personnel'], 1):
            top_data.append([
                str(idx),
                person['name'],
                person['dienstgrad'],
                str(person['attendance_count']),
                f"{person['attendance_rate']}%"
            ])
        
        top_table = Table(top_data, colWidths=[2*cm, 6*cm, 3*cm, 3*cm, 3*cm])
        top_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#B91C1C')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('ALIGN', (0, 0), (0, -1), 'CENTER'),
            ('ALIGN', (1, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('GRID', (0, 0), (-1, -1), 1, colors.grey),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#F9FAFB')]),
        ]))
        story.append(top_table)
        story.append(Spacer(1, 0.5*cm))
        
        # By rank
        story.append(Paragraph("<b>Teilnahme nach Dienstgrad</b>", styles['Heading2']))
        rank_data = [['Dienstgrad', 'Anzahl Teilnahmen']]
        for rank in stats_data['by_rank']:
            rank_data.append([rank['dienstgrad'], str(rank['attendance_count'])])
        
        rank_table = Table(rank_data, colWidths=[10*cm, 7*cm])
        rank_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#B91C1C')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 11),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
            ('GRID', (0, 0), (-1, -1), 1, colors.grey),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#F9FAFB')]),
        ]))
        story.append(rank_table)
        story.append(Spacer(1, 0.5*cm))
        
        # Monthly overview
        story.append(PageBreak())
        story.append(Paragraph("<b>Monatliche Übersicht</b>", styles['Heading2']))
        
        monthly_data = [['Monat', 'Gesamt Sessions']]
        for month in stats_data['monthly']:
            monthly_data.append([
                month['month_name'],
                str(month['total_sessions'])
            ])
        
        monthly_table = Table(monthly_data, colWidths=[10*cm, 7*cm])
        monthly_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#B91C1C')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('GRID', (0, 0), (-1, -1), 1, colors.grey),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#F9FAFB')]),
        ]))
        story.append(monthly_table)
        
        # Footer
        story.append(Spacer(1, 1*cm))
        footer_text = f"Erstellt am {datetime.now().strftime('%d.%m.%Y um %H:%M Uhr')}"
        footer = Paragraph(footer_text, styles['Normal'])
        story.append(footer)
        
        # Build PDF
        doc.build(story)
        buffer.seek(0)
        return buffer.getvalue()
