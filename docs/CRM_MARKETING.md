# FitOS CRM & Marketing Architecture

**Version 1.0** | Based on trainer pain point research  
**Goal:** Eliminate the 5-10 tool juggling trainers currently face

---

## Problem Statement

Trainers currently use separate tools for:
1. Wix/Squarespace (website)
2. Mailchimp/ConvertKit (email)
3. Calendly (scheduling)
4. Typeform (forms)
5. Stripe (payments)
6. Google Sheets (lead tracking)
7. Instagram DMs (communication)

Trainerize scores **5.5/10 on marketing features** with no real CRM.

---

## CRM Data Model

### Database Schema

```sql
-- Lead management
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Contact info
  email TEXT NOT NULL,
  name TEXT,
  phone TEXT,
  
  -- Attribution
  source TEXT NOT NULL, -- 'website', 'instagram', 'facebook', 'referral', 'google', 'manual'
  source_detail TEXT,   -- Campaign name, referrer name, ad set, etc.
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  
  -- Pipeline
  stage TEXT DEFAULT 'new' CHECK (stage IN ('new', 'contacted', 'qualified', 'consultation', 'proposal', 'won', 'lost')),
  score INTEGER DEFAULT 0,
  
  -- Engagement
  last_contacted_at TIMESTAMPTZ,
  last_activity_at TIMESTAMPTZ,
  
  -- Outcome
  lost_reason TEXT,
  converted_client_id UUID REFERENCES profiles(id),
  
  -- Meta
  notes TEXT,
  tags TEXT[],
  custom_fields JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_leads_trainer ON leads(trainer_id);
CREATE INDEX idx_leads_stage ON leads(trainer_id, stage);
CREATE INDEX idx_leads_source ON leads(trainer_id, source);

-- Lead activity tracking
CREATE TABLE lead_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL,
  description TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Email templates
CREATE TABLE email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  body_text TEXT,
  category TEXT,
  variables TEXT[],
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Email sequences (automated campaigns)
CREATE TABLE email_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  trigger_type TEXT NOT NULL,
  trigger_config JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE email_sequence_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_id UUID NOT NULL REFERENCES email_sequences(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES email_templates(id),
  step_order INTEGER NOT NULL,
  delay_days INTEGER DEFAULT 0,
  delay_hours INTEGER DEFAULT 0,
  conditions JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Email sends (tracking)
CREATE TABLE email_sends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID NOT NULL REFERENCES profiles(id),
  template_id UUID REFERENCES email_templates(id),
  recipient_email TEXT NOT NULL,
  recipient_type TEXT NOT NULL,
  recipient_id UUID,
  subject TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Lead capture forms
CREATE TABLE lead_forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  fields JSONB NOT NULL,
  settings JSONB DEFAULT '{}',
  embed_code TEXT,
  submissions_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Marketing analytics (daily aggregates)
CREATE TABLE marketing_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  leads_new INTEGER DEFAULT 0,
  leads_converted INTEGER DEFAULT 0,
  leads_by_source JSONB DEFAULT '{}',
  emails_sent INTEGER DEFAULT 0,
  emails_opened INTEGER DEFAULT 0,
  revenue_from_new_clients DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(trainer_id, date)
);
```

---

## Lead Pipeline Service

```typescript
// core/services/lead.service.ts
import { Injectable, inject, signal, computed } from '@angular/core';
import { SupabaseService } from './supabase.service';

export type LeadStage = 'new' | 'contacted' | 'qualified' | 'consultation' | 'proposal' | 'won' | 'lost';

export interface Lead {
  id: string;
  email: string;
  name?: string;
  phone?: string;
  source: string;
  sourceDetail?: string;
  stage: LeadStage;
  score: number;
  lastContactedAt?: Date;
  notes?: string;
  tags: string[];
  createdAt: Date;
}

@Injectable({ providedIn: 'root' })
export class LeadService {
  private supabase = inject(SupabaseService);
  private _leads = signal<Lead[]>([]);
  
  leads = this._leads.asReadonly();

  pipelineStats = computed(() => {
    const leads = this._leads();
    return {
      new: leads.filter(l => l.stage === 'new').length,
      contacted: leads.filter(l => l.stage === 'contacted').length,
      qualified: leads.filter(l => l.stage === 'qualified').length,
      consultation: leads.filter(l => l.stage === 'consultation').length,
      won: leads.filter(l => l.stage === 'won').length,
      lost: leads.filter(l => l.stage === 'lost').length
    };
  });

  conversionRate = computed(() => {
    const stats = this.pipelineStats();
    const total = Object.values(stats).reduce((a, b) => a + b, 0);
    return total > 0 ? Math.round((stats.won / total) * 100) : 0;
  });

  async loadLeads(trainerId: string): Promise<void> {
    const { data, error } = await this.supabase.client
      .from('leads')
      .select('*')
      .eq('trainer_id', trainerId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    this._leads.set(data?.map(this.mapLead) || []);
  }

  async createLead(trainerId: string, lead: Partial<Lead>): Promise<Lead> {
    const { data, error } = await this.supabase.client
      .from('leads')
      .insert({
        trainer_id: trainerId,
        email: lead.email,
        name: lead.name,
        phone: lead.phone,
        source: lead.source || 'manual',
        tags: lead.tags || []
      })
      .select()
      .single();

    if (error) throw error;
    const newLead = this.mapLead(data);
    this._leads.update(leads => [newLead, ...leads]);
    return newLead;
  }

  async updateStage(leadId: string, newStage: LeadStage): Promise<void> {
    await this.supabase.client
      .from('leads')
      .update({ stage: newStage, updated_at: new Date().toISOString() })
      .eq('id', leadId);

    this._leads.update(leads =>
      leads.map(l => l.id === leadId ? { ...l, stage: newStage } : l)
    );
  }

  async getSourceAttribution(trainerId: string, days = 30): Promise<Record<string, number>> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data } = await this.supabase.client
      .from('leads')
      .select('source')
      .eq('trainer_id', trainerId)
      .gte('created_at', startDate.toISOString());

    return data?.reduce((acc, lead) => {
      acc[lead.source] = (acc[lead.source] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) || {};
  }

  private mapLead(data: any): Lead {
    return {
      id: data.id,
      email: data.email,
      name: data.name,
      phone: data.phone,
      source: data.source,
      sourceDetail: data.source_detail,
      stage: data.stage,
      score: data.score,
      lastContactedAt: data.last_contacted_at ? new Date(data.last_contacted_at) : undefined,
      notes: data.notes,
      tags: data.tags || [],
      createdAt: new Date(data.created_at)
    };
  }
}
```

---

## Pre-Built Email Templates

### Welcome Sequence (4 emails over 7 days)

| Day | Subject | Purpose |
|-----|---------|---------|
| 0 | Here's your free [LEAD_MAGNET] 🎉 | Deliver lead magnet + trainer story |
| 1 | Quick question for you | Engagement - ask #1 goal |
| 3 | How [client] lost 20 lbs | Social proof + value |
| 7 | Ready when you are | Soft consultation CTA |

### Win-Back Sequence (3 emails over 21 days)

| Day | Subject | Purpose |
|-----|---------|---------|
| 0 | We miss you, {{first_name}} | Re-engagement |
| 7 | What if we tried something different? | New offer/approach |
| 21 | Last chance: Special offer | Urgency + discount |

---

## Implementation Phases

### Sprint 11: CRM Foundation
- [ ] Lead database schema migration
- [ ] LeadService CRUD operations
- [ ] Lead pipeline UI (Kanban drag-drop)
- [ ] Manual lead creation
- [ ] Lead detail view with activity timeline

### Sprint 12: Email Marketing
- [ ] Resend/SendGrid integration
- [ ] Email template CRUD
- [ ] Template editor (WYSIWYG)
- [ ] Sequence builder UI
- [ ] Open/click tracking webhooks
- [ ] Marketing analytics dashboard

---

## Success Metrics

- Lead-to-client conversion rate: Target 15%+
- Email open rate: Target 30%+
- Email click rate: Target 5%+
- Trainer adoption of CRM features: 60%+
