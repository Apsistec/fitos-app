const { Document, Packer, Paragraph, Table, TableRow, TableCell, PageSize, PageMargins, HeadingLevel, TextRun, WidthType, BorderStyle, PageBreak, ShadingType, Footer, PageNumber, Header, convertInchesToTwip, UnderlineType } = require('docx');
const fs = require('fs');

// Color palette for sprint phases
const colors = {
  phaseFoundation: 'DCE5F0',    // Light blue
  phaseClient: 'E2F0D9',        // Light green
  phaseTrainer: 'FCE4D6',       // Light orange
  phaseOwner: 'F4CCCC',         // Light red
  phaseDocumentation: 'E8DAEF'  // Light purple
};

function getPhaseColor(sprintNum) {
  if (sprintNum <= 2) return colors.phaseFoundation;
  if (sprintNum <= 5) return colors.phaseClient;
  if (sprintNum <= 8) return colors.phaseTrainer;
  if (sprintNum <= 10) return colors.phaseOwner;
  return colors.phaseDocumentation;
}

// Helper to create heading
function createHeading(text, level) {
  return new Paragraph({
    text: text,
    heading: HeadingLevel[`HEADING_${level}`],
    themeColor: 'accent1',
    bold: true,
    spacing: { before: 200, after: 100 }
  });
}

// Helper to create normal paragraph
function createParagraph(text, options = {}) {
  return new Paragraph({
    text: text,
    spacing: options.spacing || { before: 0, after: 100 },
    bullet: options.bullet ? { level: 0 } : undefined,
    ...options
  });
}

// Helper to create numbered list items
function createNumberedItem(text, level = 0) {
  return new Paragraph({
    text: text,
    numPr: {
      ilvl: level,
      numId: 1
    },
    spacing: { after: 50 }
  });
}

// Create title page
function createTitlePage() {
  return [
    new Paragraph({
      text: '',
      spacing: { after: 400 }
    }),
    new Paragraph({
      text: 'FitOS Development',
      fontSize: 72,
      bold: true,
      alignment: 'center',
      spacing: { after: 0 },
      themeColor: 'accent1'
    }),
    new Paragraph({
      text: 'Sprint Plan',
      fontSize: 64,
      bold: true,
      alignment: 'center',
      spacing: { before: 0, after: 400 },
      themeColor: 'accent1'
    }),
    new Paragraph({
      text: '',
      spacing: { after: 300 }
    }),
    new Paragraph({
      text: '12 Sprints | 4 Phases | 6 Months',
      fontSize: 20,
      alignment: 'center',
      spacing: { after: 200 }
    }),
    new Paragraph({
      text: 'Q1 2025 - Q2 2025',
      fontSize: 16,
      alignment: 'center',
      spacing: { after: 600 },
      color: '666666'
    }),
    new Paragraph({
      text: 'Foundation • Client Features • Trainer Features • Owner Features • Documentation',
      fontSize: 14,
      alignment: 'center',
      spacing: { after: 1000 },
      italics: true,
      color: '888888'
    }),
    new PageBreak()
  ];
}

// Create table of contents
function createTableOfContents() {
  return [
    createHeading('Table of Contents', 1),
    createParagraph('Sprint Overview'),
    createParagraph('Phase 1: Foundation & Auth (Sprints 1-2)', { spacing: { after: 50 } }),
    createParagraph('Phase 2: Client Features (Sprints 3-5)', { spacing: { after: 50 } }),
    createParagraph('Phase 3: Trainer Features (Sprints 6-8)', { spacing: { after: 50 } }),
    createParagraph('Phase 4: Owner Features (Sprints 9-10)', { spacing: { after: 50 } }),
    createParagraph('Phase 5: Documentation & Help (Sprints 11-12)', { spacing: { after: 50 } }),
    createParagraph('Sprint Velocity Estimates', { spacing: { after: 100 } }),
    createParagraph('Definition of Done'),
    new PageBreak()
  ];
}

// Create sprint overview section
function createSprintOverview() {
  return [
    createHeading('Sprint Overview', 1),
    new Paragraph({
      children: [
        new TextRun({
          text: 'Total: ',
          bold: true
        }),
        new TextRun('12 Sprints across 4 phases. Each sprint is 2 weeks.')
      ],
      spacing: { after: 100 }
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: 'Duration: ',
          bold: true
        }),
        new TextRun('24 weeks (6 months)')
      ],
      spacing: { after: 100 }
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: 'Approach: ',
          bold: true
        }),
        new TextRun('Role-based feature development with critical auth foundation first')
      ],
      spacing: { after: 200 }
    }),
    new PageBreak()
  ];
}

// Create phase and sprint sections
function createPhaseSection() {
  const phases = [
    {
      num: 1,
      title: 'Phase 1: Foundation & Auth',
      sprints: [
        {
          num: 1,
          title: 'Auth & Role Enforcement',
          priority: 'CRITICAL',
          tasks: [
            'Fix auth system so credentials are role-scoped (user registered as client cannot login to trainer portal)',
            'Add role validation on login - verify user\'s stored role matches requested login endpoint',
            'Implement role-specific redirect after login',
            'Add role claim to JWT via Supabase custom access token hook',
            'Enforce role in all route guards (not just some routes)',
            'Add role-based API middleware in Supabase Edge Functions',
            'Create comprehensive RLS policies that check user role',
            'Write tests for auth flow per role',
            'Fix the database trigger for new user creation per role'
          ]
        },
        {
          num: 2,
          title: 'Tab Architecture & Navigation',
          priority: 'CRITICAL',
          tasks: [
            'Create separate tab configurations per role (not conditional rendering in one component)',
            'Client tabs: Home, Workouts, Nutrition, AI Coach, More',
            'Trainer tabs: Home, Clients, Workouts, Business, More',
            'Owner tabs: Home, Trainers, Members, Business, More',
            'Implement "More" tab as settings/overflow menu per role',
            'Create role-specific dashboard components (not one big conditional component)',
            'Create ClientDashboardComponent with client-specific widgets',
            'Create TrainerDashboardComponent with trainer-specific widgets',
            'Create OwnerDashboardComponent with owner-specific widgets',
            'Wire up proper lazy loading per role\'s feature modules'
          ]
        }
      ]
    },
    {
      num: 2,
      title: 'Phase 2: Client Features',
      sprints: [
        {
          num: 3,
          title: 'Client Workout Experience',
          priority: 'HIGH',
          tasks: [
            'Polish workout execution flow (active workout page)',
            'Implement voice workout logging integration',
            'Add rest timer with haptic feedback',
            'Create workout history with filtering/sorting',
            'Build progress charts (strength over time, volume tracking)',
            'Add personal record (PR) detection and celebration',
            'Implement body measurement tracking page',
            'Add progress photo capture and timeline',
            'Connect workout data to real Supabase queries (remove stubs)'
          ]
        },
        {
          num: 4,
          title: 'Client Nutrition Experience',
          priority: 'HIGH',
          tasks: [
            'Polish food search with USDA database',
            'Implement voice food logging with Deepgram',
            'Implement photo nutrition with AI analysis',
            'Build daily nutrition summary (adherence-neutral colors)',
            'Create nutrition history with weekly/monthly views',
            'Add macro trend charts',
            'Implement meal timing suggestions based on chronotype',
            'Connect to real nutrition data (remove stubs)'
          ]
        },
        {
          num: 5,
          title: 'Client Engagement Features',
          priority: 'HIGH',
          tasks: [
            'Build recovery score dashboard (HRV, sleep, readiness)',
            'Implement wellness check-in flow',
            'Create chronotype assessment quiz',
            'Polish gamification (streaks, badges, milestones)',
            'Build leaderboard with opt-in privacy',
            'Add celebration effects (confetti for PRs, streak milestones)',
            'Implement JITAI notifications (just-in-time adaptive interventions)',
            'Build client subscription management page'
          ]
        }
      ]
    },
    {
      num: 3,
      title: 'Phase 3: Trainer Features',
      sprints: [
        {
          num: 6,
          title: 'Trainer Client Management',
          priority: 'HIGH',
          tasks: [
            'Build comprehensive client list with search, filter, sort',
            'Create rich client detail page with all data tabs',
            'Implement client invitation flow with custom messaging',
            'Build nutrition target setting for clients',
            'Create client autonomy assessment scoring',
            'Implement graduation workflow (client to independent mode)',
            'Build needs-attention alerts system',
            'Connect all client data to Supabase (remove stubs)'
          ]
        },
        {
          num: 7,
          title: 'Trainer Workout Tools',
          priority: 'HIGH',
          tasks: [
            'Build exercise library management (create, edit, categorize)',
            'Create workout template builder (drag & drop exercises)',
            'Implement workout assignment flow (select client, template, schedule)',
            'Build workout prescription editor (sets, reps, rest, RPE, tempo)',
            'Create client workout review (prescribed vs actual)',
            'Implement video form review with timeline annotation',
            'Build session scheduling and clock-in/out',
            'Add session notes per client'
          ]
        },
        {
          num: 8,
          title: 'Trainer Business Tools',
          priority: 'CRITICAL',
          tasks: [
            'Build CRM pipeline view (kanban board)',
            'Create lead management (add, edit, status, follow-up)',
            'Implement email template editor',
            'Build automated email sequences',
            'Create CRM analytics dashboard (conversion, pipeline value)',
            'Build revenue dashboard (monthly revenue, payments, payouts)',
            'Implement Stripe Connect onboarding flow',
            'Create pricing tier management',
            'Build payment history view',
            'Implement Coach Brain AI methodology setup'
          ]
        }
      ]
    },
    {
      num: 4,
      title: 'Phase 4: Owner Features',
      sprints: [
        {
          num: 9,
          title: 'Owner Management Features',
          priority: 'HIGH',
          tasks: [
            'Build trainer list with performance metrics',
            'Create trainer invitation and onboarding flow',
            'Implement trainer performance comparison dashboard',
            'Build member overview (all clients across trainers)',
            'Create member retention analytics',
            'Implement facility settings management',
            'Build staff account management',
            'Create multi-location support (if applicable)'
          ]
        },
        {
          num: 10,
          title: 'Owner Business & Analytics',
          priority: 'CRITICAL',
          tasks: [
            'Build comprehensive revenue dashboard',
            'Create financial reporting (monthly/quarterly)',
            'Implement facility analytics (utilization, peak hours, capacity)',
            'Build client outcomes reporting',
            'Create export functionality (PDF/CSV reports)',
            'Implement facility-level CRM pipeline',
            'Build marketing campaign management',
            'Create acquisition analytics (lead sources, funnels)',
            'Implement audit log viewer (HIPAA compliance)',
            'Build owner-specific Stripe configuration'
          ]
        }
      ]
    },
    {
      num: 5,
      title: 'Phase 5: Documentation & Help',
      sprints: [
        {
          num: 11,
          title: 'Help Center & Documentation',
          priority: 'MEDIUM',
          tasks: [
            'Build help center page structure (role-specific)',
            'Create getting started guides per role',
            'Write feature guide articles (20+ articles)',
            'Create FAQ content per role',
            'Build search functionality for help articles',
            'Create contact support flow',
            'Generate screenshots/mockups for documentation',
            'Build interactive feature tours (optional)',
            'Create video placeholder content descriptions'
          ]
        },
        {
          num: 12,
          title: 'Marketing Docs & Polish',
          priority: 'MEDIUM',
          tasks: [
            'Create landing page documentation/features section',
            'Build comparison pages (FitOS vs competitors)',
            'Create "How It Works" visual guides per role',
            'Write pricing explanation with value propositions',
            'Build changelog page content',
            'Create API documentation (if applicable)',
            'Final UI polish pass across all roles',
            'Cross-role testing and QA',
            'Performance optimization',
            'Accessibility audit and fixes'
          ]
        }
      ]
    }
  ];

  const sections = [];

  phases.forEach((phase) => {
    sections.push(
      createHeading(`Phase ${phase.num}: ${phase.title}`, 2),
      new Paragraph({
        text: '',
        spacing: { after: 200 }
      })
    );

    phase.sprints.forEach((sprint) => {
      const phaseColor = getPhaseColor(sprint.num);
      const priorityColor = sprint.priority === 'CRITICAL' ? 'FF0000' : sprint.priority === 'HIGH' ? 'FF9500' : '4472C4';

      sections.push(
        createHeading(`Sprint ${sprint.num}: ${sprint.title}`, 3),
        new Paragraph({
          children: [
            new TextRun({
              text: `Weeks ${sprint.num * 2 - 1}-${sprint.num * 2} • `,
              color: '666666'
            }),
            new TextRun({
              text: `Priority: ${sprint.priority}`,
              bold: true,
              color: priorityColor
            })
          ],
          spacing: { after: 200 }
        })
      );

      // Sprint tasks
      sprint.tasks.forEach((task, idx) => {
        sections.push(
          createNumberedItem(task)
        );
      });

      sections.push(
        new Paragraph({
          text: '',
          spacing: { after: 200 }
        })
      );
    });

    sections.push(
      new PageBreak()
    );
  });

  return sections;
}

// Create velocity table
function createVelocityTable() {
  const velocityData = [
    { sprint: 'S1', points: 34, risk: 'High', deps: 'Supabase auth config' },
    { sprint: 'S2', points: 29, risk: 'Medium', deps: 'Sprint 1' },
    { sprint: 'S3', points: 26, risk: 'Low', deps: 'Sprint 2' },
    { sprint: 'S4', points: 24, risk: 'Low', deps: 'Sprint 2' },
    { sprint: 'S5', points: 21, risk: 'Medium', deps: 'Sprints 3,4' },
    { sprint: 'S6', points: 28, risk: 'Medium', deps: 'Sprint 2' },
    { sprint: 'S7', points: 30, risk: 'Medium', deps: 'Sprint 6' },
    { sprint: 'S8', points: 34, risk: 'High', deps: 'Stripe account' },
    { sprint: 'S9', points: 26, risk: 'Medium', deps: 'Sprint 6' },
    { sprint: 'S10', points: 32, risk: 'High', deps: 'Sprint 9' },
    { sprint: 'S11', points: 20, risk: 'Low', deps: 'All features' },
    { sprint: 'S12', points: 18, risk: 'Low', deps: 'Sprint 11' }
  ];

  const headerRow = new TableRow({
    children: [
      new TableCell({
        children: [new Paragraph({ text: 'Sprint', bold: true })],
        shading: { fill: '4472C4', type: ShadingType.CLEAR },
        width: { size: 15, type: WidthType.PERCENTAGE }
      }),
      new TableCell({
        children: [new Paragraph({ text: 'Story Points', bold: true })],
        shading: { fill: '4472C4', type: ShadingType.CLEAR },
        width: { size: 18, type: WidthType.PERCENTAGE }
      }),
      new TableCell({
        children: [new Paragraph({ text: 'Risk Level', bold: true })],
        shading: { fill: '4472C4', type: ShadingType.CLEAR },
        width: { size: 18, type: WidthType.PERCENTAGE }
      }),
      new TableCell({
        children: [new Paragraph({ text: 'Dependencies', bold: true })],
        shading: { fill: '4472C4', type: ShadingType.CLEAR },
        width: { size: 49, type: WidthType.PERCENTAGE }
      })
    ]
  });

  const dataRows = velocityData.map((row) => {
    const phaseColor = getPhaseColor(parseInt(row.sprint.substring(1)));
    const riskColor = row.risk === 'High' ? 'FFCCCC' : row.risk === 'Medium' ? 'FFE6CC' : 'CCFFCC';

    return new TableRow({
      children: [
        new TableCell({
          children: [new Paragraph({ text: row.sprint, bold: true })],
          shading: { fill: phaseColor, type: ShadingType.CLEAR },
          width: { size: 15, type: WidthType.PERCENTAGE }
        }),
        new TableCell({
          children: [new Paragraph({ text: row.points.toString() })],
          shading: { fill: phaseColor, type: ShadingType.CLEAR },
          width: { size: 18, type: WidthType.PERCENTAGE }
        }),
        new TableCell({
          children: [new Paragraph({ text: row.risk })],
          shading: { fill: riskColor, type: ShadingType.CLEAR },
          width: { size: 18, type: WidthType.PERCENTAGE }
        }),
        new TableCell({
          children: [new Paragraph({ text: row.deps })],
          shading: { fill: phaseColor, type: ShadingType.CLEAR },
          width: { size: 49, type: WidthType.PERCENTAGE }
        })
      ]
    });
  });

  return [
    createHeading('Sprint Velocity Estimates', 1),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [headerRow, ...dataRows]
    }),
    new Paragraph({ text: '', spacing: { after: 300 } })
  ];
}

// Create definition of done section
function createDefinitionOfDone() {
  return [
    createHeading('Definition of Done', 1),
    createParagraph('All code follows Angular 21 patterns (signals, OnPush, inject())'),
    createParagraph('Ionic 8 components used properly'),
    createParagraph('Adherence-neutral design tokens used (no red for "over")'),
    createParagraph('Dark-first design maintained'),
    createParagraph('Role guards enforced on all routes'),
    createParagraph('RLS policies tested'),
    createParagraph('Unit tests written for services'),
    createParagraph('E2E tests for critical flows'),
    createParagraph('Help center article exists for each feature'),
    createParagraph('No TypeScript errors (strict mode)')
  ];
}

// Create header and footer
function createHeaderFooter() {
  return {
    header: new Header({
      children: [
        new Paragraph({
          text: 'FitOS Development Sprint Plan',
          alignment: 'center',
          color: '4472C4',
          italics: true
        })
      ]
    }),
    footer: new Footer({
      children: [
        new Paragraph({
          children: [
            new TextRun({
              text: 'Page '
            }),
            new TextRun({
              field: 'PAGE'
            })
          ],
          alignment: 'center'
        })
      ]
    })
  };
}

// Main document generation
async function generateDocument() {
  const headerFooter = createHeaderFooter();

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(0.75),
              right: convertInchesToTwip(0.75),
              bottom: convertInchesToTwip(0.75),
              left: convertInchesToTwip(0.75)
            }
          }
        },
        ...headerFooter,
        children: [
          ...createTitlePage(),
          ...createTableOfContents(),
          ...createSprintOverview(),
          ...createPhaseSection(),
          ...createVelocityTable(),
          ...createDefinitionOfDone()
        ]
      }
    ]
  });

  const buffer = await Packer.toBuffer(doc);
  const outputPath = '/sessions/pensive-clever-heisenberg/mnt/fitos-app/docs/FitOS_Sprint_Plan.docx';
  fs.writeFileSync(outputPath, buffer);

  console.log(`✓ Document generated successfully: ${outputPath}`);
  console.log(`✓ File size: ${(buffer.length / 1024).toFixed(2)} KB`);
}

generateDocument().catch(err => {
  console.error('Error generating document:', err);
  process.exit(1);
});
