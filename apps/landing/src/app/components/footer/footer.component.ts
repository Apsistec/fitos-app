import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconComponent } from '../icon/icon.component';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [RouterLink, IconComponent],
  template: `
    <footer class="bg-gray-900 text-gray-400">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div class="grid grid-cols-2 md:grid-cols-4 gap-8">
          <!-- Brand -->
          <div class="col-span-2 md:col-span-1">
            <a routerLink="/" class="flex items-center gap-2 mb-4">
              <div class="w-8 h-8 bg-gradient-to-br from-primary-500 to-violet-600 rounded-lg flex items-center justify-center">
                <app-icon name="lightning" size="sm" class="text-white" />
              </div>
              <span class="text-xl font-bold text-white">FitOS</span>
            </a>
            <p class="text-sm">
              The personal trainer's personal trainer software. 
              AI-powered fitness coaching platform.
            </p>
          </div>

          <!-- Product -->
          <div>
            <h4 class="text-white font-semibold mb-4">Product</h4>
            <ul class="space-y-2 text-sm">
              <li><a routerLink="/features" class="hover:text-white transition-colors">Features</a></li>
              <li><a routerLink="/pricing" class="hover:text-white transition-colors">Pricing</a></li>
              <li><a routerLink="/changelog" class="hover:text-white transition-colors">Changelog</a></li>
              <li><a routerLink="/roadmap" class="hover:text-white transition-colors">Roadmap</a></li>
            </ul>
          </div>

          <!-- Resources -->
          <div>
            <h4 class="text-white font-semibold mb-4">Resources</h4>
            <ul class="space-y-2 text-sm">
              <li><a href="https://docs.fitos.app" target="_blank" rel="noopener noreferrer" class="hover:text-white transition-colors">Documentation</a></li>
              <li><a routerLink="/blog" class="hover:text-white transition-colors">Blog</a></li>
              <li><a routerLink="/help" class="hover:text-white transition-colors">Help Center</a></li>
            </ul>
          </div>

          <!-- Legal -->
          <div>
            <h4 class="text-white font-semibold mb-4">Legal</h4>
            <ul class="space-y-2 text-sm">
              <li><a routerLink="/privacy" class="hover:text-white transition-colors">Privacy Policy</a></li>
              <li><a routerLink="/terms" class="hover:text-white transition-colors">Terms of Service</a></li>
              <li><a routerLink="/cookies" class="hover:text-white transition-colors">Cookie Policy</a></li>
            </ul>
          </div>
        </div>

        <div class="border-t border-gray-800 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p class="text-sm">© 2025 FitOS. All rights reserved.</p>
          <div class="flex items-center gap-4">
            <!-- Social Links -->
            <a href="https://twitter.com/fitosapp" target="_blank" class="hover:text-white transition-colors">
              <app-icon name="twitter" size="sm" />
            </a>
            <a href="https://github.com/fitosapp" target="_blank" class="hover:text-white transition-colors">
              <app-icon name="github" size="sm" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  `,
})
export class FooterComponent {}
