import { Component, OnInit, inject, ChangeDetectionStrategy } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { filter } from 'rxjs/operators';
import { AuthService } from './core/services/auth.service';
import { ThemeService } from './core/services/theme.service';
import { FirebaseService } from './core/services/firebase.service';
import { DeepLinkService } from './core/services/deep-link.service';
import { AppShortcutsService } from './core/services/app-shortcuts.service';
import { WidgetService } from './core/services/widget.service';
import { addIcons } from 'ionicons';
import {
  // Outline icons (used across the app)
  addCircleOutline, addOutline, albumsOutline, alertCircleOutline,
  analyticsOutline, archiveOutline, arrowBackOutline, arrowDownOutline,
  arrowForwardOutline, arrowUndoOutline, arrowUpOutline, banOutline,
  barChartOutline, barbellOutline, bedOutline, bodyOutline, bookOutline,
  briefcaseOutline, buildOutline, bulbOutline, businessOutline,
  calculatorOutline, calendarOutline, callOutline, cameraOutline,
  cardOutline, cashOutline, chatboxOutline, chatbubbleEllipsesOutline,
  chatbubbleOutline, chatbubblesOutline, checkboxOutline,
  checkmarkCircleOutline, checkmarkDoneOutline, checkmarkOutline,
  chevronBackOutline, chevronForwardOutline, clipboardOutline,
  closeCircleOutline, closeOutline, codeOutline, cogOutline,
  constructOutline, copyOutline, createOutline, documentTextOutline,
  downloadOutline, ellipseOutline, ellipsisHorizontalOutline,
  ellipsisVerticalOutline, extensionPuzzleOutline, eyeOffOutline,
  eyeOutline, filterOutline, fingerPrintOutline, fitnessOutline,
  flagOutline, flameOutline, flashOutline, footstepsOutline,
  funnelOutline, giftOutline, globeOutline, heartOutline,
  helpCircleOutline, helpOutline, homeOutline, imagesOutline,
  informationCircleOutline, keyOutline, linkOutline, listOutline,
  locationOutline, lockClosedOutline, logOutOutline, mailOpenOutline,
  mailOutline, medalOutline, megaphoneOutline, micOutline, moonOutline,
  navigateOutline, newspaperOutline, notificationsOutline,
  nutritionOutline, openOutline, paperPlaneOutline, pauseOutline,
  pencilOutline, peopleOutline, personAddOutline, personCircleOutline,
  personOutline, personRemoveOutline, phonePortraitOutline,
  playCircleOutline, playOutline, podiumOutline, pricetagOutline,
  pricetagsOutline, pulseOutline, qrCodeOutline, receiptOutline,
  refreshOutline, removeCircleOutline, removeOutline,
  reorderThreeOutline, reorderTwoOutline, restaurantOutline,
  ribbonOutline, rocketOutline, saveOutline, scaleOutline,
  schoolOutline, searchOutline, sendOutline, settingsOutline,
  shareOutline, shareSocialOutline, shieldCheckmarkOutline,
  shieldOutline, sparklesOutline, starOutline, statsChartOutline,
  stopOutline, storefrontOutline, sunnyOutline, swapHorizontalOutline,
  textOutline, thumbsDownOutline, thumbsUpOutline, timeOutline,
  timerOutline, trashOutline, trendingDownOutline, trendingUpOutline,
  trophyOutline, videocamOutline, walletOutline, warningOutline,
  watchOutline,
  // Filled icons (used for active states, tabs, status indicators)
  add, arrowForward, barbell, briefcase, call, camera, card, cash,
  chatbubble, checkmark, checkmarkCircle, chevronForward, close,
  closeCircle, ellipse, ellipsisHorizontal, ellipsisVertical, fitness,
  heart, home, informationCircle, medkit, mic, nutrition, people,
  person, play, reorderThree, send, settings, shieldCheckmark,
  sparkles, star, trendingDown, trendingUp, trophy, warning, watch,
  // Logo icons (social sign-in, platform references)
  logoApple, logoFacebook, logoGithub, logoGoogle, logoInstagram,
  logoMicrosoft, logoTwitter,
} from 'ionicons/icons';

@Component({
  standalone: true,
  selector: 'app-root',
  imports: [IonApp, IonRouterOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ion-app>
      <a href="#main-content" class="skip-link">Skip to main content</a>
      <ion-router-outlet id="main-content"></ion-router-outlet>
    </ion-app>
  `,
  styles: [`
    .skip-link {
      position: absolute;
      top: -40px;
      left: 0;
      padding: 8px 16px;
      background: var(--ion-color-primary);
      color: var(--ion-color-primary-contrast);
      z-index: 100;
      text-decoration: none;
      border-radius: 0 0 4px 0;
      font-weight: 600;
    }

    .skip-link:focus {
      top: 0;
    }
  `],
})
export class AppComponent implements OnInit {
  private authService = inject(AuthService);
  private themeService = inject(ThemeService); // Initialize theme service
  private firebaseService = inject(FirebaseService); // Initialize Firebase Analytics & Performance
  private deepLinkService = inject(DeepLinkService); // Central deep-link router (NFC, QR, push)
  private appShortcutsService = inject(AppShortcutsService); // Home-screen quick actions
  private widgetService = inject(WidgetService); // Native home/lock screen widgets
  private router = inject(Router);

  constructor() {
    // Track screen views on route navigation (Firebase Analytics)
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
    ).subscribe((event) => {
      this.firebaseService.trackScreenView(event.urlAfterRedirects);
    });

    // Register only the icons actually used in the app (tree-shakeable)
    addIcons({
      // Outline icons
      'add-circle-outline': addCircleOutline, 'add-outline': addOutline,
      'albums-outline': albumsOutline, 'alert-circle-outline': alertCircleOutline,
      'analytics-outline': analyticsOutline, 'archive-outline': archiveOutline,
      'arrow-back-outline': arrowBackOutline, 'arrow-down-outline': arrowDownOutline,
      'arrow-forward-outline': arrowForwardOutline, 'arrow-undo-outline': arrowUndoOutline,
      'arrow-up-outline': arrowUpOutline, 'ban-outline': banOutline,
      'bar-chart-outline': barChartOutline, 'barbell-outline': barbellOutline,
      'bed-outline': bedOutline, 'body-outline': bodyOutline, 'book-outline': bookOutline,
      'briefcase-outline': briefcaseOutline, 'build-outline': buildOutline,
      'bulb-outline': bulbOutline, 'business-outline': businessOutline,
      'calculator-outline': calculatorOutline, 'calendar-outline': calendarOutline,
      'call-outline': callOutline, 'camera-outline': cameraOutline,
      'card-outline': cardOutline, 'cash-outline': cashOutline,
      'chatbox-outline': chatboxOutline, 'chatbubble-ellipses-outline': chatbubbleEllipsesOutline,
      'chatbubble-outline': chatbubbleOutline, 'chatbubbles-outline': chatbubblesOutline,
      'checkbox-outline': checkboxOutline, 'checkmark-circle-outline': checkmarkCircleOutline,
      'checkmark-done-outline': checkmarkDoneOutline, 'checkmark-outline': checkmarkOutline,
      'chevron-back-outline': chevronBackOutline, 'chevron-forward-outline': chevronForwardOutline,
      'clipboard-outline': clipboardOutline, 'close-circle-outline': closeCircleOutline,
      'close-outline': closeOutline, 'code-outline': codeOutline, 'cog-outline': cogOutline,
      'construct-outline': constructOutline, 'copy-outline': copyOutline,
      'create-outline': createOutline, 'document-text-outline': documentTextOutline,
      'download-outline': downloadOutline, 'ellipse-outline': ellipseOutline,
      'ellipsis-horizontal-outline': ellipsisHorizontalOutline,
      'ellipsis-vertical-outline': ellipsisVerticalOutline,
      'extension-puzzle-outline': extensionPuzzleOutline,
      'eye-off-outline': eyeOffOutline, 'eye-outline': eyeOutline,
      'filter-outline': filterOutline, 'finger-print-outline': fingerPrintOutline,
      'fitness-outline': fitnessOutline, 'flag-outline': flagOutline,
      'flame-outline': flameOutline, 'flash-outline': flashOutline,
      'footsteps-outline': footstepsOutline, 'funnel-outline': funnelOutline,
      'gift-outline': giftOutline, 'globe-outline': globeOutline,
      'heart-outline': heartOutline, 'help-circle-outline': helpCircleOutline,
      'help-outline': helpOutline, 'home-outline': homeOutline,
      'images-outline': imagesOutline, 'information-circle-outline': informationCircleOutline,
      'key-outline': keyOutline, 'link-outline': linkOutline, 'list-outline': listOutline,
      'location-outline': locationOutline, 'lock-closed-outline': lockClosedOutline,
      'log-out-outline': logOutOutline, 'mail-open-outline': mailOpenOutline,
      'mail-outline': mailOutline, 'medal-outline': medalOutline,
      'megaphone-outline': megaphoneOutline, 'mic-outline': micOutline,
      'moon-outline': moonOutline, 'navigate-outline': navigateOutline,
      'newspaper-outline': newspaperOutline, 'notifications-outline': notificationsOutline,
      'nutrition-outline': nutritionOutline, 'open-outline': openOutline,
      'paper-plane-outline': paperPlaneOutline, 'pause-outline': pauseOutline,
      'pencil-outline': pencilOutline, 'people-outline': peopleOutline,
      'person-add-outline': personAddOutline, 'person-circle-outline': personCircleOutline,
      'person-outline': personOutline, 'person-remove-outline': personRemoveOutline,
      'phone-portrait-outline': phonePortraitOutline,
      'play-circle-outline': playCircleOutline, 'play-outline': playOutline,
      'podium-outline': podiumOutline, 'pricetag-outline': pricetagOutline,
      'pricetags-outline': pricetagsOutline, 'pulse-outline': pulseOutline,
      'qr-code-outline': qrCodeOutline, 'receipt-outline': receiptOutline,
      'refresh-outline': refreshOutline, 'remove-circle-outline': removeCircleOutline,
      'remove-outline': removeOutline, 'reorder-three-outline': reorderThreeOutline,
      'reorder-two-outline': reorderTwoOutline, 'restaurant-outline': restaurantOutline,
      'ribbon-outline': ribbonOutline, 'rocket-outline': rocketOutline,
      'save-outline': saveOutline, 'scale-outline': scaleOutline,
      'school-outline': schoolOutline, 'search-outline': searchOutline,
      'send-outline': sendOutline, 'settings-outline': settingsOutline,
      'share-outline': shareOutline, 'share-social-outline': shareSocialOutline,
      'shield-checkmark-outline': shieldCheckmarkOutline, 'shield-outline': shieldOutline,
      'sparkles-outline': sparklesOutline, 'star-outline': starOutline,
      'stats-chart-outline': statsChartOutline, 'stop-outline': stopOutline,
      'storefront-outline': storefrontOutline, 'sunny-outline': sunnyOutline,
      'swap-horizontal-outline': swapHorizontalOutline, 'text-outline': textOutline,
      'thumbs-down-outline': thumbsDownOutline, 'thumbs-up-outline': thumbsUpOutline,
      'time-outline': timeOutline, 'timer-outline': timerOutline,
      'trash-outline': trashOutline, 'trending-down-outline': trendingDownOutline,
      'trending-up-outline': trendingUpOutline, 'trophy-outline': trophyOutline,
      'videocam-outline': videocamOutline, 'wallet-outline': walletOutline,
      'warning-outline': warningOutline, 'watch-outline': watchOutline,
      // Filled icons
      'add': add, 'arrow-forward': arrowForward, 'barbell': barbell,
      'briefcase': briefcase, 'call': call, 'camera': camera, 'card': card,
      'cash': cash, 'chatbubble': chatbubble, 'checkmark': checkmark,
      'checkmark-circle': checkmarkCircle, 'chevron-forward': chevronForward,
      'close': close, 'close-circle': closeCircle, 'ellipse': ellipse,
      'ellipsis-horizontal': ellipsisHorizontal, 'ellipsis-vertical': ellipsisVertical,
      'fitness': fitness, 'heart': heart, 'home': home,
      'information-circle': informationCircle, 'medkit': medkit, 'mic': mic,
      'nutrition': nutrition, 'people': people, 'person': person, 'play': play,
      'reorder-three': reorderThree, 'send': send, 'settings': settings,
      'shield-checkmark': shieldCheckmark, 'sparkles': sparkles, 'star': star,
      'trending-down': trendingDown, 'trending-up': trendingUp, 'trophy': trophy,
      'warning': warning, 'watch': watch,
      // Logo icons
      'logo-apple': logoApple, 'logo-facebook': logoFacebook, 'logo-github': logoGithub,
      'logo-google': logoGoogle, 'logo-instagram': logoInstagram,
      'logo-microsoft': logoMicrosoft, 'logo-twitter': logoTwitter,
    });

    // Initialize auth state listener immediately in constructor
    // This ensures auth is initializing before route guards run
    this.authService.initAuthListener();

    // Initialize central deep-link router (handles NFC, QR, push notification deep links)
    this.deepLinkService.initialize();

    // Register and listen for home-screen quick action shortcuts (Sprint 47)
    this.appShortcutsService.registerShortcuts();
    this.appShortcutsService.startListening();
  }

  ngOnInit(): void {
    // Auth initialization moved to constructor for earlier execution
  }
}
