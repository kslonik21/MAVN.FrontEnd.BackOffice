import {IntegerRangeValidator} from 'src/app/shared/utils/validators';
import {Component, EventEmitter, Input, OnInit, Output, OnDestroy, LOCALE_ID, Inject, ElementRef, ViewChild} from '@angular/core';
import {FormArray, FormBuilder, Validators, AbstractControl, ValidatorFn} from '@angular/forms';
import {markFormControlAsTouched} from '../../../shared/utils/markFormControlAsTouched';
// tslint:disable-next-line: prettier
import {
  LengthValidator,
  FileSizeValidator,
  FileExtensionValidator,
  AccuracyValidator,
  MoneyFormatValidator,
  MoneyMinMoreZeroValidator,
  MoneyMaxNumberValidator,
  FileDimensionsValidator,
  IntegerValidator
} from '../../../shared/utils/validators';
import {Subscription} from 'rxjs';
import {SpendActionRule} from '../models/spend-action-rule.interface';
import {MobileLanguage} from '../../../shared/models/mobile-language.enum';
import {MatSnackBar} from '@angular/material';
import {FormMode} from 'src/app/shared/models/form-mode.interface';
import {DictionaryService} from 'src/app/shared/services/dictionary.service';
import * as constants from 'src/app/core/constants/const';
import {BusinessVerticalType} from '../../partners/models/business-vertical.enum';
import {BusinessVerticalTypeItem} from '../../partners/models/business-vertical-type-item.interface';
import {BusinessVerticalService} from '../../partners/services/business-vertical.service';
import {TranslateService} from 'src/app/shared/services/translate.service';
import {PartnersService} from '../../partners/partners.service';
import {PartnerRowResponse} from '../../partners/models/partner-row.interface';
import {PartnersContainer} from '../../partners/models/partners-container.interface';
import {GlobalTemplates} from 'src/app/shared/models/global-templates.interface';
import {GlobalSettingsService} from '../../global-settings/services/global-settings.service';
import {GlobalRate} from '../../global-settings/models/global-rate.interface';
import {SettingsService} from 'src/app/core/settings/settings.service';
import * as actionRulesConstants from '../../action-rule/constants/const';
import {AuthenticationService} from 'src/app/authentication/authentication.service';
import {PermissionType} from '../../user/models/permission-type.enum';

@Component({
  selector: 'app-spend-action-rule-form',
  templateUrl: './spend-action-rule-form.component.html',
  styleUrls: ['./spend-action-rule-form.component.scss']
})
export class SpendActionRuleFormComponent implements OnInit, OnDestroy {
  @Input()
  type: FormMode = FormMode.Create;

  @Input()
  isSaving: boolean;

  @Output()
  submitSuccess: EventEmitter<SpendActionRule> = new EventEmitter<SpendActionRule>();

  @Input()
  rule: SpendActionRule;

  // bindable fields
  tokenSymbol = constants.TOKEN_SYMBOL;
  CURRENCY_INPUT_ACCURACY = constants.CURRENCY_INPUT_ACCURACY;
  CURRENCY_INPUT_MAX_NUMBER = constants.CURRENCY_INPUT_MAX_NUMBER;
  CURRENCY_INPUT_MIN_NUMBER = constants.CURRENCY_INPUT_MIN_NUMBER;
  INTEGER_MAX_NUMBER = constants.INTEGER_MAX_NUMBER;
  TOKENS_INPUT_ACCURACY = constants.TOKENS_INPUT_ACCURACY;
  TOKENS_INPUT_MAX_NUMBER = constants.TOKENS_INPUT_MAX_NUMBER;
  MOBILE_APP_IMAGE_ACCEPTED_FILE_EXTENSION = actionRulesConstants.MOBILE_APP_IMAGE_ACCEPTED_FILE_EXTENSION;
  BusinessVerticalType = BusinessVerticalType;
  businessVerticalTypes: BusinessVerticalTypeItem[] = [];
  baseCurrencyCode: string;
  // partners
  businessVerticalDisplayNamesDict: {[key: string]: string} = {};
  isLoadingPartners: boolean;
  partners: PartnerRowResponse[] = [];
  ruleFormProps = {
    Title: 'Title',
    Order: 'Order',
    BusinessVertical: 'BusinessVertical',
    PartnerIds: 'PartnerIds',
    PartnersSearch: 'PartnersSearch',
    Type: 'Type',
    VouchersFile: 'VouchersFile',
    Price: 'Price',
    Description: 'Description',
    AmountInTokens: 'AmountInTokens',
    AmountInCurrency: 'AmountInCurrency',
    UsePartnerCurrencyRate: 'UsePartnerCurrencyRate',
    MobileContents: 'MobileContents'
  };
  VouchersCount = 0;
  VouchersInStockCount = 0;
  typeDefaultValue = 'Vouchers';
  voucherFileExtension = '.csv';
  priceValidatorsWithRequired = [
    // validators
    Validators.required,
    Validators.min(0),
    Validators.max(constants.INTEGER_MAX_NUMBER),
    IntegerValidator
  ];

  globalRate: GlobalRate;
  isLoadingRate = true;

  // bindable fields - mobile content related
  MobileAppImageFileSizeInKB: number;
  MobileAppImageMinWidth: number;
  MobileAppImageMinHeight: number;
  mobileContentFormProps = {
    MobileLanguage: 'MobileLanguage',
    Title: 'Title',
    Description: 'Description',
    File: 'File',
    ImageBlobUrl: 'ImageBlobUrl'
  };
  contentPreviewTitle: string;
  contentPreviewDescription: string;
  contentPreviewImageUrl: string;
  mobileLanguages = MobileLanguage;
  availableMobileLanguages: MobileLanguage[] = [];
  orderValues: number[];

  // private
  private subscriptions: Subscription[] = [];
  private rateDependencyLoadedEventEmitter = new EventEmitter();
  private emptyPartnerIdsValue: string[] = [];

  // private - mobile content related
  private isEnglish: boolean;
  private subscriptionsContentPreview: Subscription[] = [];
  private isTitleCopied: boolean;
  private isDescriptionCopied: boolean;
  private imageUrlsDictionary: {[language: string]: string} = {};

  // #region translates
  @ViewChild('fillRequiredFieldsMessage')
  fillRequiredFieldsMessage: ElementRef<HTMLElement>;
  private translates = {
    fillRequiredFieldsMessage: ''
  };

  templates: GlobalTemplates;
  // #endregion
  hasEditPermission = false;

  constructor(
    private authenticationService: AuthenticationService,
    private businessVerticalService: BusinessVerticalService,
    private settingsService: SettingsService,
    private dictionaryService: DictionaryService,
    private globalSettingsService: GlobalSettingsService,
    private partnersService: PartnersService,
    private translateService: TranslateService,
    private fb: FormBuilder,
    private snackBar: MatSnackBar,
    @Inject(LOCALE_ID) private locale: string
  ) {
    this.hasEditPermission = this.authenticationService.getUserPermissions()[PermissionType.ActionRules].Edit;
    this.isEnglish = this.locale.startsWith('en');
    this.templates = this.translateService.templates;
    this.baseCurrencyCode = this.settingsService.baseCurrencyCode;
    this.MobileAppImageFileSizeInKB = this.settingsService.MobileAppImageFileSizeInKB;
    this.MobileAppImageMinWidth = this.settingsService.MobileAppImageMinWidth;
    this.MobileAppImageMinHeight = this.settingsService.MobileAppImageMinHeight;

    this.orderValues = Array.from({length: 100}, (_v, k) => k + 1);
  }

  actionRuleForm = this.fb.group({
    [this.ruleFormProps.Title]: [null, [Validators.required, LengthValidator(3, 50)]],
    [this.ruleFormProps.Order]: [null, [Validators.required, IntegerValidator, IntegerRangeValidator(1, 2147483647)]],
    [this.ruleFormProps.BusinessVertical]: [null, [Validators.required]],
    [this.ruleFormProps.PartnerIds]: [this.emptyPartnerIdsValue, null],
    [this.ruleFormProps.PartnersSearch]: [null],
    [this.ruleFormProps.Type]: [this.typeDefaultValue],
    [this.ruleFormProps.VouchersFile]: [null, [FileExtensionValidator(this.voucherFileExtension), FileSizeValidator(1024 /*KB*/)]],
    [this.ruleFormProps.Price]: [
      null,
      [
        // validators
        Validators.min(0),
        Validators.max(constants.INTEGER_MAX_NUMBER),
        IntegerValidator
      ]
    ],
    [this.ruleFormProps.Description]: [null, [LengthValidator(3, 1000)]],
    [this.ruleFormProps.AmountInTokens]: [
      null,
      [
        // validators
        Validators.required,
        MoneyFormatValidator(),
        MoneyMinMoreZeroValidator(),
        MoneyMaxNumberValidator(),
        AccuracyValidator(constants.TOKENS_INPUT_ACCURACY)
      ]
    ],
    [this.ruleFormProps.AmountInCurrency]: [
      null,
      [
        // Validators
        Validators.required,
        Validators.min(constants.CURRENCY_INPUT_MIN_NUMBER),
        Validators.max(constants.CURRENCY_INPUT_MAX_NUMBER),
        AccuracyValidator(constants.CURRENCY_INPUT_ACCURACY)
      ]
    ],
    [this.ruleFormProps.UsePartnerCurrencyRate]: [true],
    [this.ruleFormProps.MobileContents]: this.fb.array([])
  });

  get mobileContentsFormArray() {
    return this.actionRuleForm.get(this.ruleFormProps.MobileContents) as FormArray;
  }
  get mobileContentsEnglishOnly(): AbstractControl[] {
    return this.mobileContentsFormArray.controls
      ? this.mobileContentsFormArray.controls.filter(x => x.get(this.mobileContentFormProps.MobileLanguage).value === MobileLanguage.En)
      : this.mobileContentsFormArray.controls;
  }
  get usePartnerCurrencyRate() {
    return this.actionRuleForm.get(this.ruleFormProps.UsePartnerCurrencyRate).value;
  }
  private get tokensControl() {
    return this.actionRuleForm.get(this.ruleFormProps.AmountInTokens);
  }
  private get currencyControl() {
    return this.actionRuleForm.get(this.ruleFormProps.AmountInCurrency);
  }

  previousPage = '';
  previousPageSize = '';

  ngOnInit() {
    this.previousPage = window.history.state.page;
    this.previousPageSize = window.history.state.pageSize;

    // translates
    this.translates.fillRequiredFieldsMessage = this.fillRequiredFieldsMessage.nativeElement.innerText;

    this.businessVerticalTypes = this.businessVerticalService.getBusinessVerticalItems();

    this.businessVerticalDisplayNamesDict = this.businessVerticalService.getBusinessVerticalItems().reduce((obj, item) => {
      obj[item.Type] = item.DisplayName;
      return obj;
    }, {} as {[key: string]: string});

    this.loadRate();
    this.loadAllPartners();

    if (this.rule) {
      if (this.rule.PartnerIds && !this.rule.PartnerIds.length) {
        this.rule.PartnerIds = this.emptyPartnerIdsValue;
      }

      //#region mobile content related
      this.rule.MobileContents.forEach(mobContent => {
        this.mobileContentsFormArray.push(this.generateMobileContentFormGroup(mobContent.MobileLanguage, !!mobContent.ImageId));

        // store image urls
        if (mobContent && mobContent.Image) {
          this.imageUrlsDictionary[mobContent.MobileLanguage] = mobContent.Image.ImageBlobUrl;
        }
      });
      //#endregion

      (this.rule as any).Type = this.typeDefaultValue;

      this.actionRuleForm.reset(this.rule);

      // disable fields in order to defence from human mistake of changing Price for already imported vouchers
      if (this.rule.Price && this.rule.Price > 0 && this.rule.BusinessVertical === BusinessVerticalType.Retail) {
        this.actionRuleForm.get(this.ruleFormProps.Price).setValidators(this.priceValidatorsWithRequired);

        this.VouchersCount = this.rule.VouchersCount;
        this.VouchersInStockCount = this.rule.VouchersInStockCount;
      }

      if (!this.hasEditPermission) {
        this.actionRuleForm.disable();
      }
    } else {
      this.actionRuleForm.get(this.ruleFormProps.PartnerIds).disable();
      this.actionRuleForm.get(this.ruleFormProps.Price).disable();
      this.disableRateFields(true);

      //#region mobile content related
      this.availableMobileLanguages = this.dictionaryService.getMobileLanguages();
      this.availableMobileLanguages.forEach(language => {
        this.mobileContentsFormArray.push(this.generateMobileContentFormGroup(language));
      });
      //#endregion
    }

    // mobile content related
    this.updateContentPreviewBindings(0);

    this.subscriptions = [
      this.actionRuleForm.get(this.ruleFormProps.UsePartnerCurrencyRate).valueChanges.subscribe(value => {
        if (value) {
          this.setPartnerOrGlobalRate(this.actionRuleForm.get(this.ruleFormProps.PartnerIds).value);
        } else {
          this.disableRateFields(false);
        }
      }),
      this.actionRuleForm.get(this.ruleFormProps.PartnerIds).valueChanges.subscribe(value => {
        this.setPartnerOrGlobalRate(value);
      }),
      this.rateDependencyLoadedEventEmitter.subscribe(() => {
        // check that all necessary dependencies have loaded and then continue with logic
        if (this.globalRate && !this.isLoadingPartners) {
          this.isLoadingRate = false;

          if (this.rule) {
            this.setPartnerOrGlobalRate(this.rule.PartnerIds);
          } else {
            this.setToGlobalRate();
          }
        }
      })
    ];
  }

  ngOnDestroy() {
    this.subscriptions.forEach(subscription => subscription.unsubscribe());
    // mobile content related
    this.subscriptionsContentPreview.forEach(subscription => subscription.unsubscribe());
  }

  private loadRate(): void {
    this.globalSettingsService.getGlobalRate().subscribe(
      response => {
        this.globalRate = response;

        this.rateDependencyLoadedEventEmitter.emit();
      },
      error => {
        console.error(error);
        this.snackBar.open(this.translateService.translates.ErrorMessage, this.translateService.translates.CloseSnackbarBtnText);
      }
    );
  }

  private setPartnerOrGlobalRate(partnerIds: string[]): void {
    if (this.usePartnerCurrencyRate && partnerIds) {
      if (partnerIds.length > 1 || !partnerIds.length) {
        this.setToGlobalRate();
      } else if (partnerIds.length === 1) {
        const partner = this.partners.find(x => x.Id === partnerIds[0]);

        if (partner) {
          if (partner.UseGlobalCurrencyRate) {
            this.setToGlobalRate();
          } else {
            // set partners rate
            this.tokensControl.setValue(partner.AmountInTokens);
            this.currencyControl.setValue(partner.AmountInCurrency);
            this.disableRateFields(true);
          }
        }
      }
    }
  }

  private setToGlobalRate(): void {
    if (!this.globalRate) {
      return;
    }

    this.tokensControl.setValue(this.globalRate.AmountInTokens);
    this.currencyControl.setValue(this.globalRate.AmountInCurrency);
    this.disableRateFields(true);
  }

  private disableRateFields(disable: boolean): void {
    if (disable) {
      this.tokensControl.disable();
      this.currencyControl.disable();
    } else {
      this.tokensControl.enable();
      this.currencyControl.enable();
    }
  }

  onBusinessVerticalChanged(): void {
    const vertical = this.actionRuleForm.get(this.ruleFormProps.BusinessVertical).value;

    if (vertical) {
      this.actionRuleForm.get(this.ruleFormProps.PartnerIds).enable();
      this.actionRuleForm.get(this.ruleFormProps.PartnerIds).setValue(this.emptyPartnerIdsValue);
      this.setPartnersAvailability();

      if (vertical !== BusinessVerticalType.Retail) {
        const fileControl = this.actionRuleForm.get(this.ruleFormProps.VouchersFile);
        fileControl.setValue(null);
        fileControl.updateValueAndValidity();

        // price
        const priceControl = this.actionRuleForm.get(this.ruleFormProps.Price);
        priceControl.setValue(null);
        priceControl.setValidators(null);
        priceControl.updateValueAndValidity();
      }
    }
  }

  // disable partners if the Vertical does not have them
  setPartnersAvailability(): void {
    const vertical = this.actionRuleForm.get(this.ruleFormProps.BusinessVertical).value;
    const partnersControl = this.actionRuleForm.get(this.ruleFormProps.PartnerIds);

    if (vertical) {
      const partnersByVertical = this.partners.filter(x => x.BusinessVertical && x.BusinessVertical === vertical);
      const hasPartners = partnersByVertical && partnersByVertical.length;

      if (!hasPartners) {
        partnersControl.disable();
      }
    }
  }

  // #region Vouchers

  addVouchersFiles(files: FileList): void {
    if (!files || files.length === 0) {
      return;
    }

    const fileControl = this.actionRuleForm.get(this.ruleFormProps.VouchersFile);

    markFormControlAsTouched(fileControl);
    fileControl.setValue(files[0]);
    fileControl.updateValueAndValidity();

    this.updatePriceValidity();
  }

  private updatePriceValidity() {
    const vertical = this.actionRuleForm.get(this.ruleFormProps.BusinessVertical).value;

    if (vertical === BusinessVerticalType.Retail) {
      const priceControl = this.actionRuleForm.get(this.ruleFormProps.Price);

      if (!this.rule) {
        priceControl.enable();
        markFormControlAsTouched(priceControl);
      }

      priceControl.setValidators(this.priceValidatorsWithRequired);
      priceControl.updateValueAndValidity();
    }
  }

  // #endregion

  // #region Partners

  selectPartners(): void {
    const businessVertical = this.actionRuleForm.get(this.ruleFormProps.BusinessVertical).value;

    if (!businessVertical) {
      return;
    }

    const partnersByVertical = this.partners.filter(x => x.BusinessVertical && x.BusinessVertical === businessVertical).map(x => x.Id);
    const partnersControl = this.actionRuleForm.get(this.ruleFormProps.PartnerIds);
    partnersControl.setValue(partnersByVertical);
  }

  deselectPartners(): void {
    const partnersControl = this.actionRuleForm.get(this.ruleFormProps.PartnerIds);
    partnersControl.setValue([]);
  }

  private loadAllPartners() {
    this.isLoadingPartners = true;

    const page = 1;
    this.loadPagedPartners(page);
  }

  private loadPagedPartners(page: number) {
    this.partnersService.getAll(constants.MAX_PAGE_SIZE, page, '').subscribe(
      response => {
        this.partners = [...this.partners, ...response.Partners];

        if (this.partners.length >= response.PagedResponse.TotalCount) {
          this.partners = this.partners.sort((a, b) => (a.Name > b.Name ? 1 : -1));
          this.isLoadingPartners = false;
          this.rateDependencyLoadedEventEmitter.emit();
          this.setPartnersAvailability();
        } else {
          page++;
          this.loadPagedPartners(page);
        }
      },
      () => {
        this.snackBar.open(this.translateService.translates.ErrorMessage, this.translateService.translates.CloseSnackbarBtnText);
        this.isLoadingPartners = false;
      }
    );
  }

  // #endregion Partners

  // #region Mobile Content

  private generateMobileContentFormGroup(language: MobileLanguage | string, hasImage: boolean = null) {
    const titleValidators: ValidatorFn[] = [];
    const descriptionValidators: ValidatorFn[] = [];
    const fileValidators: ValidatorFn[] = [];

    if (language === MobileLanguage.En) {
      titleValidators.push(Validators.required);
      descriptionValidators.push(Validators.required);

      if (!hasImage) {
        // fileValidators.push(Validators.required);
      }
    }

    titleValidators.push(LengthValidator(3, 50));
    descriptionValidators.push(LengthValidator(3, 1000));
    fileValidators.push(
      ...[FileExtensionValidator(this.getAcceptFilesExtensions()), FileSizeValidator(this.settingsService.MobileAppImageFileSizeInKB)]
    );

    return this.fb.group({
      [this.mobileContentFormProps.MobileLanguage]: [language],
      [this.mobileContentFormProps.Title]: [null, titleValidators],
      [this.mobileContentFormProps.Description]: [null, descriptionValidators],
      [this.mobileContentFormProps.File]: [
        null,
        fileValidators,
        [FileDimensionsValidator(this.MobileAppImageMinWidth, this.MobileAppImageMinHeight)]
      ],
      [this.mobileContentFormProps.ImageBlobUrl]: [null]
    });
  }

  private getAcceptFilesExtensions(): string {
    return actionRulesConstants.MOBILE_APP_IMAGE_ACCEPTED_FILE_EXTENSION;
  }

  onTitleBlur() {
    if (this.isEnglish && !this.isTitleCopied && this.type === FormMode.Create) {
      const titleControl = this.actionRuleForm.get(this.mobileContentFormProps.Title);

      if (titleControl.value && titleControl.valid) {
        const mobileContentTitleControl = this.mobileContentsFormArray.controls.find(
          control => control.get(this.mobileContentFormProps.MobileLanguage).value === MobileLanguage.En
        );

        if (mobileContentTitleControl) {
          mobileContentTitleControl.get(this.mobileContentFormProps.Title).setValue(titleControl.value);
          this.isTitleCopied = true;
        }
      }
    }
  }

  onDescriptionBlur() {
    if (this.isEnglish && !this.isDescriptionCopied && this.type === FormMode.Create) {
      const descriptionControl = this.actionRuleForm.get(this.ruleFormProps.Description);

      if (descriptionControl.value && descriptionControl.valid) {
        const mobileContentTitleControl = this.mobileContentsFormArray.controls.find(
          control => control.get(this.mobileContentFormProps.MobileLanguage).value === MobileLanguage.En
        );

        if (mobileContentTitleControl) {
          mobileContentTitleControl.get(this.mobileContentFormProps.Description).setValue(descriptionControl.value);
          this.isDescriptionCopied = true;
        }
      }
    }
  }

  addFiles(files: FileList, index: number): void {
    if (!files || files.length === 0) {
      return;
    }

    const fileControl = this.mobileContentsFormArray.at(index).get(this.mobileContentFormProps.File);

    markFormControlAsTouched(fileControl);
    fileControl.setValue(files[0]);
    fileControl.updateValueAndValidity();

    // This is a workaround with an issue that the Angular team has not fixed yet.
    // The issue is that when you have AsyncValidator, you don't receive properly whether the field is valid or not.
    // The main idea here is to run this function on the next event lifecycle.
    // It works with value of "1", but just to be sure, I put "200". It does not interfere with the performance and the user flow.
    setTimeout(() => {
      this.updateContentPreviewImageUrl(fileControl);
    }, 200);
  }

  private updateContentPreviewImageUrl(fileControl: AbstractControl) {
    if (fileControl.value && fileControl.valid) {
      const reader = new FileReader();
      reader.onload = () => (this.contentPreviewImageUrl = reader.result as string);
      reader.readAsDataURL(fileControl.value);
    } else {
      this.contentPreviewImageUrl = null;
    }
  }

  selectedTabIndexChange(index: number) {
    this.updateContentPreviewBindings(index);
  }

  private updateContentPreviewBindings(selectedTabIndex: number) {
    const currentTabFormGroup = this.mobileContentsFormArray.at(selectedTabIndex);

    const mobileLanguage = currentTabFormGroup.get(this.mobileContentFormProps.MobileLanguage).value;
    const titleControl = currentTabFormGroup.get(this.mobileContentFormProps.Title);
    const descriptionControl = currentTabFormGroup.get(this.mobileContentFormProps.Description);
    const fileControl = currentTabFormGroup.get(this.mobileContentFormProps.File);

    if (fileControl && fileControl.value && fileControl.valid) {
      this.updateContentPreviewImageUrl(fileControl);
    } else if (this.imageUrlsDictionary[mobileLanguage]) {
      this.contentPreviewImageUrl = this.imageUrlsDictionary[mobileLanguage];
    } else {
      this.contentPreviewImageUrl = null;
    }

    this.contentPreviewTitle = titleControl.value;
    this.contentPreviewDescription = descriptionControl.value;

    if (this.subscriptionsContentPreview.length) {
      this.subscriptionsContentPreview.forEach(subscription => subscription.unsubscribe());
    }

    this.subscriptionsContentPreview = [
      titleControl.valueChanges.subscribe(value => {
        this.contentPreviewTitle = value;
      }),
      descriptionControl.valueChanges.subscribe(value => {
        this.contentPreviewDescription = value;
      })
    ];
  }

  // #endregion

  onSubmit() {
    if (!this.hasEditPermission) {
      return;
    }

    markFormControlAsTouched(this.actionRuleForm);

    if (!this.actionRuleForm.valid) {
      this.snackBar.open(this.translates.fillRequiredFieldsMessage, this.translateService.translates.CloseSnackbarBtnText, {
        duration: 5000
      });
      return;
    }

    const actionRule = this.actionRuleForm.getRawValue() as SpendActionRule;

    PartnersContainer.HandlePartnersBeforeSaving(actionRule);

    this.submitSuccess.emit(actionRule);
  }
}
