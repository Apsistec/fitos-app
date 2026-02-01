import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent, type IconName } from '../../components/icon/icon.component';

@Component({
  selector: 'app-home',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, IconComponent],
  template: `
    <!-- Hero Section -->
    <section class="relative overflow-hidden bg-gradient-to-b from-primary-50 to-white dark:from-gray-900 dark:to-gray-950 pt-16 pb-24">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center max-w-4xl mx-auto">
          <!-- Badge -->
          <div class="inline-flex items-center gap-2 bg-primary-100 dark:bg-primary-500/10 text-primary-700 dark:text-primary-400 px-4 py-1.5 rounded-full text-sm font-medium mb-8 border border-primary-200 dark:border-primary-500/20">
            <span class="w-2 h-2 bg-primary-500 rounded-full animate-pulse"></span>
            Now with AI-Powered Coaching
          </div>

          <!-- Headline -->
          <h1 class="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-gray-900 dark:text-white leading-tight mb-6">
            The Personal Trainer's
            <span class="gradient-text"> Personal Trainer</span>
            Software
          </h1>

          <!-- Subheadline -->
          <p class="text-xl text-gray-600 dark:text-gray-300 mb-10 max-w-2xl mx-auto">
            Unlimited clients. One price. Build workouts, track nutrition, get paid —
            all in one AI-powered platform built specifically for solo trainers.
          </p>

          <!-- CTA Buttons -->
          <div class="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a href="https://app.fitos.app/auth/register" class="btn-primary text-lg px-8 py-4">
              Start Free Trial
              <app-icon name="arrow-right" size="sm" class="ml-2" />
            </a>
          </div>

          <!-- Social Proof -->
          <div class="mt-12 flex flex-col items-center">
            <div class="flex -space-x-3">
              @for (i of [1,2,3,4,5]; track i) {
                <div class="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-violet-500 border-2 border-white dark:border-gray-900 flex items-center justify-center text-white text-xs font-bold">
                  {{ ['JD', 'MK', 'SL', 'AR', 'TC'][i-1] }}
                </div>
              }
            </div>
            <p class="mt-3 text-gray-600 dark:text-gray-400">
              <span class="font-semibold text-gray-900 dark:text-white">500+</span> trainers already growing with FitOS
            </p>
          </div>
        </div>
      </div>

      <!-- Background decoration -->
      <div class="absolute -top-24 -right-24 w-96 h-96 bg-primary-200 dark:bg-primary-500/20 rounded-full blur-3xl opacity-30"></div>
      <div class="absolute -bottom-24 -left-24 w-96 h-96 bg-violet-200 dark:bg-violet-500/20 rounded-full blur-3xl opacity-30"></div>
    </section>

    <!-- Problem Section -->
    <section class="py-24 bg-white dark:bg-gray-950">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center mb-16">
          <h2 class="section-title mb-4">
            Existing platforms are holding you back
          </h2>
          <p class="section-subtitle">
            We analyzed thousands of reviews. Here's what trainers hate about current software.
          </p>
        </div>

        <div class="grid md:grid-cols-3 gap-8">
          @for (problem of problems; track problem.title) {
            <div class="bg-red-50 dark:bg-red-950/30 rounded-2xl p-8 border border-red-100 dark:border-red-900/30">
              <div class="w-12 h-12 bg-red-100 dark:bg-red-950/50 rounded-xl flex items-center justify-center mb-6 border-0 dark:border dark:border-red-900/30">
                <app-icon name="close" size="md" class="text-red-600 dark:text-red-400" />
              </div>
              <h3 class="text-xl font-bold text-gray-900 dark:text-white mb-3">{{ problem.title }}</h3>
              <p class="text-gray-600 dark:text-gray-400">{{ problem.description }}</p>
            </div>
          }
        </div>
      </div>
    </section>

    <!-- Features Section -->
    <section class="py-24 bg-gray-50 dark:bg-gray-900">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center mb-16">
          <h2 class="section-title mb-4">
            Everything you need. Nothing you don't.
          </h2>
          <p class="section-subtitle">
            Built by trainers, for trainers. Every feature exists because you asked for it.
          </p>
        </div>

        <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          @for (feature of features; track feature.title) {
            <div class="feature-card">
              <div class="w-12 h-12 bg-primary-100 dark:bg-primary-500/10 rounded-xl flex items-center justify-center mb-6 flex-shrink-0 border-0 dark:border dark:border-primary-500/20">
                <app-icon [name]="feature.iconType" size="md" class="text-primary-600 dark:text-primary-400" />
              </div>
              <h3 class="text-xl font-bold text-gray-900 dark:text-white mb-3">{{ feature.title }}</h3>
              <p class="text-gray-600 dark:text-gray-400">{{ feature.description }}</p>
            </div>
          }
        </div>
      </div>
    </section>

    <!-- Pricing Preview -->
    <section class="py-24 bg-white dark:bg-gray-950">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center mb-16">
          <h2 class="section-title mb-4">
            Simple, transparent pricing
          </h2>
          <p class="section-subtitle">
            Unlimited clients. No per-client fees. No hidden costs.
          </p>
        </div>

        <div class="max-w-lg mx-auto">
          <div class="bg-gradient-to-br from-primary-600 to-violet-600 rounded-3xl p-8 text-white text-center shadow-2xl shadow-primary-500/50">
            <div class="text-sm font-medium text-primary-200 mb-2">TRAINER PRO</div>
            <div class="flex items-baseline justify-center gap-1 mb-6">
              <span class="text-5xl font-extrabold">$49</span>
              <span class="text-primary-200">/month</span>
            </div>
            <ul class="text-left space-y-4 mb-8">
              <li class="flex items-center gap-3">
                <app-icon name="check" size="sm" class="text-primary-300" />
                <span>Unlimited clients</span>
              </li>
              <li class="flex items-center gap-3">
                <app-icon name="check" size="sm" class="text-primary-300" />
                <span>Workout builder & templates</span>
              </li>
              <li class="flex items-center gap-3">
                <app-icon name="check" size="sm" class="text-primary-300" />
                <span>Nutrition tracking</span>
              </li>
              <li class="flex items-center gap-3">
                <app-icon name="check" size="sm" class="text-primary-300" />
                <span>Payment processing</span>
              </li>
              <li class="flex items-center gap-3">
                <app-icon name="check" size="sm" class="text-primary-300" />
                <span>Wearable integrations</span>
              </li>
              <li class="flex items-center gap-3">
                <app-icon name="check" size="sm" class="text-primary-300" />
                <span>AI coaching assistant</span>
              </li>
            </ul>
            <a href="https://app.fitos.app/auth/register"
               class="block w-full bg-white text-primary-600 font-semibold py-4 rounded-xl hover:bg-primary-50 transition-colors">
              Start 14-Day Free Trial
            </a>
            <p class="mt-4 text-sm text-primary-200">No credit card required</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Testimonials -->
    <section class="py-24 bg-gray-50 dark:bg-gray-900">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center mb-16">
          <h2 class="section-title mb-4">
            Loved by trainers everywhere
          </h2>
        </div>

        <div class="grid md:grid-cols-3 gap-8">
          @for (testimonial of testimonials; track testimonial.name) {
            <div class="bg-white dark:bg-gray-800/50 rounded-2xl p-8 shadow-lg border border-gray-100 dark:border-gray-700/50">
              <div class="flex items-center gap-1 mb-4">
                @for (i of [1,2,3,4,5]; track i) {
                  <app-icon name="star" size="sm" [fill]="true" class="text-yellow-400" />
                }
              </div>
              <p class="text-gray-600 dark:text-gray-300 mb-6">"{{ testimonial.quote }}"</p>
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-violet-500 flex items-center justify-center text-white font-bold">
                  {{ testimonial.name.charAt(0) }}
                </div>
                <div>
                  <div class="font-semibold text-gray-900 dark:text-white">{{ testimonial.name }}</div>
                  <div class="text-sm text-gray-500 dark:text-gray-400">{{ testimonial.role }}</div>
                </div>
              </div>
            </div>
          }
        </div>
      </div>
    </section>

    <!-- Final CTA -->
    <section class="py-24 bg-gradient-to-br from-primary-600 to-violet-600">
      <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 class="text-3xl sm:text-4xl font-extrabold text-white mb-6">
          Ready to scale your training business?
        </h2>
        <p class="text-xl text-primary-100 mb-10">
          Join 500+ trainers who've already made the switch.
          Start your free trial today — no credit card required.
        </p>
        <a href="https://app.fitos.app/auth/register"
           class="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-primary-600 bg-white rounded-xl hover:bg-primary-50 transition-colors shadow-xl">
          Get Started Free
          <app-icon name="arrow-right" size="sm" class="ml-2" />
        </a>
      </div>
    </section>
  `,
})
export class HomeComponent {
  problems = [
    {
      title: 'Per-Client Pricing',
      description: 'Most platforms charge you more as you grow. Adding 10 new clients shouldn\'t cost you $50+ extra per month.',
    },
    {
      title: 'Buggy & Slow',
      description: 'Crashes, sync failures, and painfully slow loading. Your clients deserve better — and so do you.',
    },
    {
      title: 'Desktop-Dependent',
      description: 'Need to edit a workout? Good luck doing it from your phone. Current tools are stuck in 2015.',
    },
  ];

  features: Array<{ iconType: IconName; title: string; description: string }> = [
    {
      iconType: 'workout',
      title: 'Workout Builder',
      description: 'Create and assign workouts in minutes. Drag-and-drop exercises, set reps, and save templates for reuse.',
    },
    {
      iconType: 'nutrition',
      title: 'Nutrition Tracking',
      description: 'Adherence-neutral logging that encourages honesty. No red warnings. No shame. Just data.',
    },
    {
      iconType: 'payments',
      title: 'Integrated Payments',
      description: 'Stripe-powered subscriptions and invoicing. Get paid automatically without chasing clients.',
    },
    {
      iconType: 'wearables',
      title: 'Wearable Sync',
      description: 'Connect Garmin, Fitbit, Oura, and more. Track sleep, HRV, and recovery — the metrics that matter.',
    },
    {
      iconType: 'ai',
      title: 'AI Coaching',
      description: 'Coming soon: AI that learns your methodology and helps coach clients in your voice, 24/7.',
    },
    {
      iconType: 'mobile',
      title: 'Mobile-First',
      description: 'Full functionality on any device. Edit workouts, message clients, and check progress from anywhere.',
    },
  ];

  testimonials = [
    {
      name: 'Sarah Mitchell',
      role: 'Online Fitness Coach',
      quote: 'Finally, software that doesn\'t punish me for growing my business. I went from 15 to 40 clients without paying a dime more.',
    },
    {
      name: 'James Rodriguez',
      role: 'Personal Trainer',
      quote: 'The mobile experience is incredible. I can do everything from my phone between sessions. Game changer.',
    },
    {
      name: 'Emily Chen',
      role: 'Nutrition Coach',
      quote: 'My clients actually log their food now because there\'s no judgment. The adherence-neutral approach works.',
    },
  ];
}
