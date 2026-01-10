import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [RouterLink],
  template: `
    <footer class="bg-gray-900 text-gray-400">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div class="grid grid-cols-2 md:grid-cols-4 gap-8">
          <!-- Brand -->
          <div class="col-span-2 md:col-span-1">
            <a routerLink="/" class="flex items-center gap-2 mb-4">
              <div class="w-8 h-8 bg-gradient-to-br from-primary-500 to-violet-600 rounded-lg flex items-center justify-center">
                <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                    d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
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
              <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
            </a>
            <a href="https://github.com/fitosapp" target="_blank" class="hover:text-white transition-colors">
              <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.604-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z"/>
              </svg>
            </a>
          </div>
        </div>
      </div>
    </footer>
  `,
})
export class FooterComponent {}
