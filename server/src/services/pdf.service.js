import PDFDocument from 'pdfkit';

/**
 * Generate a PDF buffer from resume data.
 * Supports 'professional' (blue accents) and 'modern' (dark header) templates.
 */
export async function generateResumePDF(resumeData, template = 'professional') {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 36, bottom: 36, left: 36, right: 36 },
        bufferPages: true,
      });

      const buffers = [];
      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      const s = resumeData.sections || {};
      const pi = s.personalInfo || {};

      if (template === 'modern') {
        renderModernTemplate(doc, pi, s);
      } else {
        renderProfessionalTemplate(doc, pi, s);
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

function renderProfessionalTemplate(doc, pi, s) {
  const primaryColor = '#1e40af'; // Blue
  const textColor = '#1f2937';
  const lightColor = '#6b7280';

  // Header
  doc.fontSize(22).fillColor(primaryColor).font('Helvetica-Bold').text(pi.name || 'Your Name', { align: 'center' });
  doc.moveDown(0.3);

  // Contact line
  const contacts = [pi.email, pi.phone, pi.location].filter(Boolean).join('  |  ');
  if (contacts) {
    doc.fontSize(9).fillColor(lightColor).font('Helvetica').text(contacts, { align: 'center' });
  }

  // Links line
  const links = s.links || {};
  const linksList = [links.linkedin, links.github, links.portfolio].filter(Boolean).join('  |  ');
  if (linksList) {
    doc.fontSize(8).fillColor(primaryColor).font('Helvetica').text(linksList, { align: 'center' });
  }

  doc.moveDown(0.5);
  doc.strokeColor('#e5e7eb').lineWidth(1).moveTo(36, doc.y).lineTo(559, doc.y).stroke();
  doc.moveDown(0.5);

  // Objective
  if (s.objective) {
    addSectionHeader(doc, 'CAREER OBJECTIVE', primaryColor);
    doc.fontSize(9.5).fillColor(textColor).font('Helvetica').text(s.objective, { lineGap: 2 });
    doc.moveDown(0.5);
  }

  // Education
  if (s.education && s.education.length > 0) {
    addSectionHeader(doc, 'EDUCATION', primaryColor);
    for (const edu of s.education) {
      doc.fontSize(10).fillColor(textColor).font('Helvetica-Bold').text(edu.degree || '', { continued: true });
      if (edu.year) {
        doc.font('Helvetica').fillColor(lightColor).text(`  (${edu.year})`, { align: 'right' });
      } else {
        doc.text('');
      }
      if (edu.institution) {
        doc.fontSize(9).fillColor(lightColor).font('Helvetica').text(edu.institution);
      }
      if (edu.score) {
        doc.fontSize(8.5).fillColor(primaryColor).text(`Score: ${edu.score}`);
      }
      doc.moveDown(0.3);
    }
  }

  // Skills
  if (s.skills && s.skills.length > 0) {
    addSectionHeader(doc, 'TECHNICAL SKILLS', primaryColor);
    const skillText = Array.isArray(s.skills) ? s.skills.join('  •  ') : s.skills;
    doc.fontSize(9.5).fillColor(textColor).font('Helvetica').text(skillText, { lineGap: 2 });
    doc.moveDown(0.5);
  }

  // Experience / Internships
  if (s.internships && s.internships.length > 0) {
    addSectionHeader(doc, 'EXPERIENCE & INTERNSHIPS', primaryColor);
    for (const exp of s.internships) {
      doc.fontSize(10).fillColor(textColor).font('Helvetica-Bold').text(exp.role || exp.title || '', { continued: true });
      if (exp.duration) {
        doc.font('Helvetica').fillColor(lightColor).text(`  |  ${exp.duration}`);
      } else {
        doc.text('');
      }
      if (exp.company) {
        doc.fontSize(9).fillColor(primaryColor).font('Helvetica').text(exp.company);
      }
      if (exp.description) {
        doc.fontSize(9).fillColor(textColor).font('Helvetica').text(exp.description, { lineGap: 1.5 });
      }
      doc.moveDown(0.3);
    }
  }

  // Projects
  if (s.projects && s.projects.length > 0) {
    addSectionHeader(doc, 'PROJECTS', primaryColor);
    for (const proj of s.projects) {
      doc.fontSize(10).fillColor(textColor).font('Helvetica-Bold').text(proj.title || '', { continued: true });
      if (proj.technologies) {
        doc.font('Helvetica').fillColor(lightColor).text(`  [${proj.technologies}]`);
      } else {
        doc.text('');
      }
      if (proj.description) {
        doc.fontSize(9).fillColor(textColor).font('Helvetica').text(proj.description, { lineGap: 1.5 });
      }
      if (proj.link) {
        doc.fontSize(8).fillColor(primaryColor).text(proj.link);
      }
      doc.moveDown(0.3);
    }
  }

  // Certifications
  if (s.certifications && s.certifications.length > 0) {
    addSectionHeader(doc, 'CERTIFICATIONS', primaryColor);
    for (const cert of s.certifications) {
      const text = typeof cert === 'string' ? cert : cert.name || '';
      doc.fontSize(9).fillColor(textColor).font('Helvetica').text(`•  ${text}`);
    }
    doc.moveDown(0.5);
  }

  // Achievements
  if (s.achievements && s.achievements.length > 0) {
    addSectionHeader(doc, 'ACHIEVEMENTS & AWARDS', primaryColor);
    for (const ach of s.achievements) {
      const text = typeof ach === 'string' ? ach : ach.title || '';
      doc.fontSize(9).fillColor(textColor).font('Helvetica').text(`•  ${text}`);
    }
    doc.moveDown(0.5);
  }
}

function renderModernTemplate(doc, pi, s) {
  const headerBg = '#0f172a'; // Slate 900
  const accentColor = '#3b82f6'; // Blue
  const textColor = '#1e293b';

  // Dark header block
  doc.rect(0, 0, 595, 110).fill(headerBg);

  // Name and title in header
  doc.fontSize(22).fillColor('#ffffff').font('Helvetica-Bold').text(pi.name || 'Your Name', 36, 30);
  doc.fontSize(11).fillColor(accentColor).font('Helvetica').text(pi.title || s.objective ? (pi.title || 'Professional') : '', 36, 56);

  // Contact info in header
  const contactParts = [pi.email, pi.phone, pi.location].filter(Boolean);
  doc.fontSize(8.5).fillColor('#94a3b8').font('Helvetica').text(contactParts.join('  •  '), 36, 78);

  // Reset position below header
  doc.y = 125;

  // Two-column layout: Left sidebar (160px), Right main (350px)
  const leftX = 36;
  const rightX = 210;

  // Render left column content
  let leftY = 130;

  // Skills in sidebar
  if (s.skills && s.skills.length > 0) {
    doc.fontSize(10).fillColor(accentColor).font('Helvetica-Bold').text('SKILLS', leftX, leftY);
    leftY += 16;
    const skillsList = Array.isArray(s.skills) ? s.skills : [s.skills];
    for (const skill of skillsList) {
      doc.fontSize(8.5).fillColor(textColor).font('Helvetica').text(`• ${skill}`, leftX, leftY, { width: 155 });
      leftY += 13;
    }
    leftY += 10;
  }

  // Links in sidebar
  const links = s.links || {};
  const hasLinks = links.linkedin || links.github || links.portfolio;
  if (hasLinks) {
    doc.fontSize(10).fillColor(accentColor).font('Helvetica-Bold').text('LINKS', leftX, leftY);
    leftY += 16;
    for (const [k, v] of Object.entries(links)) {
      if (v) {
        doc.fontSize(8).fillColor(textColor).font('Helvetica').text(`${k}:`, leftX, leftY, { width: 155 });
        leftY += 10;
        doc.fontSize(7.5).fillColor(accentColor).text(v, leftX, leftY, { width: 155 });
        leftY += 14;
      }
    }
  }

  // Right column: Experience, Projects, Education
  let rightY = 130;

  if (s.objective) {
    doc.fontSize(11).fillColor(accentColor).font('Helvetica-Bold').text('SUMMARY', rightX, rightY);
    rightY += 16;
    doc.fontSize(9).fillColor(textColor).font('Helvetica').text(s.objective, rightX, rightY, { width: 350, lineGap: 1.5 });
    rightY = doc.y + 12;
  }

  if (s.internships && s.internships.length > 0) {
    doc.fontSize(11).fillColor(accentColor).font('Helvetica-Bold').text('EXPERIENCE', rightX, rightY);
    rightY += 16;
    for (const exp of s.internships) {
      doc.fontSize(9.5).fillColor(textColor).font('Helvetica-Bold').text(exp.role || '', rightX, rightY);
      rightY = doc.y;
      doc.fontSize(8.5).fillColor('#64748b').font('Helvetica').text(`${exp.company || ''}  |  ${exp.duration || ''}`, rightX, rightY);
      rightY = doc.y + 2;
      if (exp.description) {
        doc.fontSize(8.5).fillColor(textColor).text(exp.description, rightX, rightY, { width: 350, lineGap: 1.5 });
        rightY = doc.y + 6;
      }
    }
    rightY += 6;
  }

  if (s.projects && s.projects.length > 0) {
    doc.fontSize(11).fillColor(accentColor).font('Helvetica-Bold').text('PROJECTS', rightX, rightY);
    rightY += 16;
    for (const proj of s.projects) {
      doc.fontSize(9.5).fillColor(textColor).font('Helvetica-Bold').text(proj.title || '', rightX, rightY);
      rightY = doc.y;
      if (proj.description) {
        doc.fontSize(8.5).fillColor(textColor).font('Helvetica').text(proj.description, rightX, rightY, { width: 350, lineGap: 1.5 });
        rightY = doc.y + 4;
      }
    }
    rightY += 6;
  }

  if (s.education && s.education.length > 0) {
    doc.fontSize(11).fillColor(accentColor).font('Helvetica-Bold').text('EDUCATION', rightX, rightY);
    rightY += 16;
    for (const edu of s.education) {
      doc.fontSize(9.5).fillColor(textColor).font('Helvetica-Bold').text(edu.degree || '', rightX, rightY);
      rightY = doc.y;
      doc.fontSize(8.5).fillColor('#64748b').font('Helvetica').text(`${edu.institution || ''}  (${edu.year || ''})`, rightX, rightY);
      rightY = doc.y + 6;
    }
  }
}

function addSectionHeader(doc, title, color) {
  doc.fontSize(11).fillColor(color).font('Helvetica-Bold').text(title);
  doc.moveDown(0.2);
  doc.strokeColor(color).lineWidth(0.5).moveTo(36, doc.y).lineTo(200, doc.y).stroke();
  doc.moveDown(0.4);
}

export default { generateResumePDF };
