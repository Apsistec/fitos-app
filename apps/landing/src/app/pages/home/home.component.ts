import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule],
  template: `
    <!-- Hero Section -->
    <section class="relative overflow-hidden bg-gradient-to-b from-primary-50 to-white pt-16 pb-24">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center max-w-4xl mx-auto">
          <!-- Badge -->
          <div class="inline-flex items-center gap-2 bg-primary-100 text-primary-700 px-4 py-1.5 rounded-full text-sm font-medium mb-8">
            <span class="w-2 h-2 bg-primary-500 rounded-full animate-pulse"></span>
            Now with AI-Powered Coaching
          </div>

          <!-- Headline -->
          <h1 class="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-gray-900 leading-tight mb-6">
            The Personal Trainer's
            <span class="gradient-text"> Personal Trainer</span>
            Software
          </h1>

          <!-- Subheadline -->
          <p class="text-xl text-gray-600 mb-10 max-w-2xl mx-auto">
            Unlimited clients. One price. Build workouts, track nutrition, get paid — 
            all in one AI-powered platform built specifically for solo trainers.
          </p>

          <!-- CTA Buttons -->
          <div class="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a href="https://app.fitos.app/auth/register" class="btn-primary text-lg px-8 py-4">
              Start Free Trial
              <svg class="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </a>
            <a href="#demo" class="btn-secondary text-lg px-8 py-4">
              Watch Demo
            </a>
          </div>

          <!-- Social Proof -->
          <div class="mt-12 flex flex-col items-center">
            <div class="flex -space-x-3">
              @for (i of [1,2,3,4,5]; track i) {
                <div class="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-violet-500 border-2 border-white flex items-center justify-center text-white text-xs font-bold">
                  {{ ['JD', 'MK', 'SL', 'AR', 'TC'][i-1] }}
                </div>
              }
            </div>
            <p class="mt-3 text-gray-600">
              <span class="font-semibold text-gray-900">500+</span> trainers already growing with FitOS
            </p>
          </div>
        </div>
      </div>

      <!-- Background decoration -->
      <div class="absolute -top-24 -right-24 w-96 h-96 bg-primary-200 rounded-full blur-3xl opacity-30"></div>
      <div class="absolute -bottom-24 -left-24 w-96 h-96 bg-violet-200 rounded-full blur-3xl opacity-30"></div>
    </section>

    <!-- Problem Section -->
    <section class="py-24 bg-white">
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
            <div class="bg-red-50 rounded-2xl p-8 border border-red-100">
              <div class="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center mb-6">
                <svg class="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h3 class="text-xl font-bold text-gray-900 mb-3">{{ problem.title }}</h3>
              <p class="text-gray-600">{{ problem.description }}</p>
            </div>
          }
        </div>
      </div>
    </section>

    <!-- Features Section -->
    <section class="py-24 bg-gray-50">
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
              <div class="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center mb-6">
                <span class="text-2xl">{{ feature.icon }}</span>
              </div>
              <h3 class="text-xl font-bold text-gray-900 mb-3">{{ feature.title }}</h3>
              <p class="text-gray-600">{{ feature.description }}</p>
            </div>
          }
        </div>
      </div>
    </section>

    <!-- Pricing Preview -->
    <section class="py-24 bg-white">
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
          <div class="bg-gradient-to-br from-primary-600 to-violet-600 rounded-3xl p-8 text-white text-center shadow-2xl shadow-primary-500/25">
            <div class="text-sm font-medium text-primary-200 mb-2">TRAINER PRO</div>
            <div class="flex items-baseline justify-center gap-1 mb-6">
              <span class="text-5xl font-extrabold">$49</span>
              <span class="text-primary-200">/month</span>
            </div>
            <ul class="text-left space-y-4 mb-8">
              <li class="flex items-center gap-3">
                <svg class="w-5 h-5 text-primary-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
                <span>Unlimited clients</span>
              </li>
              <li class="flex items-center gap-3">
                <svg class="w-5 h-5 text-primary-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
                <span>Workout builder & templates</span>
              </li>
              <li class="flex items-center gap-3">
                <svg class="w-5 h-5 text-primary-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
                <span>Nutrition tracking</span>
              </li>
              <li class="flex items-center gap-3">
                <svg class="w-5 h-5 text-primary-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
                <span>Payment processing</span>
              </li>
              <li class="flex items-center gap-3">
                <svg class="w-5 h-5 text-primary-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
                <span>Wearable integrations</span>
              </li>
              <li class="flex items-center gap-3">
                <svg class="w-5 h-5 text-primary-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
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
    <section class="py-24 bg-gray-50">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center mb-16">
          <h2 class="section-title mb-4">
            Loved by trainers everywhere
          </h2>
        </div>

        <div class="grid md:grid-cols-3 gap-8">
          @for (testimonial of testimonials; track testimonial.name) {
            <div class="bg-white rounded-2xl p-8 shadow-lg shadow-gray-100">
              <div class="flex items-center gap-1 mb-4">
                @for (i of [1,2,3,4,5]; track i) {
                  <svg class="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                  </svg>
                }
              </div>
              <p class="text-gray-600 mb-6">"{{ testimonial.quote }}"</p>
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-violet-500 flex items-center justify-center text-white font-bold">
                  {{ testimonial.name.charAt(0) }}
                </div>
                <div>
                  <div class="font-semibold text-gray-900">{{ testimonial.name }}</div>
                  <div class="text-sm text-gray-500">{{ testimonial.role }}</div>
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
          <svg class="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
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

  features = [
    {
      icon: '💪',
      title: 'Workout Builder',
      description: 'Create and assign workouts in minutes. Drag-and-drop exercises, set reps, and save templates for reuse.',
    },
    {
      icon: '🥗',
      title: 'Nutrition Tracking',
      description: 'Adherence-neutral logging that encourages honesty. No red warnings. No shame. Just data.',
    },
    {
      icon: '💳',
      title: 'Integrated Payments',
      description: 'Stripe-powered subscriptions and invoicing. Get paid automatically without chasing clients.',
    },
    {
      icon: '⌚',
      title: 'Wearable Sync',
      description: 'Connect Garmin, Fitbit, Oura, and more. Track sleep, HRV, and recovery — the metrics that matter.',
    },
    {
      icon: '🤖',
      title: 'AI Coaching',
      description: 'Coming soon: AI that learns your methodology and helps coach clients in your voice, 24/7.',
    },
    {
      icon: '📱',
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
