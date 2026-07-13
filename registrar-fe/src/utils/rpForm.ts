export interface FormData {
  legalName: string;
  tradeName: string;
  identifierType: string;
  identifierValue: string;
  infoURI: string;
  email: string;
  phone: string;
  supportURI: string;
  srvDescriptionLang: string;
  srvDescriptionContent: string;
  intendedUse: string; // JSON
  isPSB: boolean;
  entitlement: string;
  supervisoryAuthorityName: string;
  supervisoryAuthorityEmail: string;
  supervisoryAuthorityPhone: string;
  supervisoryAuthorityURI: string;
  isIntermediary: boolean;
  usesIntermediary: string; // JSON
}

export function emptyForm(): FormData {
  return {
    legalName: '',
    tradeName: '',
    identifierType: '',
    identifierValue: '',
    infoURI: '',
    email: '',
    phone: '',
    supportURI: '',
    srvDescriptionLang: '',
    srvDescriptionContent: '',
    intendedUse: '',
    isPSB: false,
    entitlement: '',
    supervisoryAuthorityName: '',
    supervisoryAuthorityEmail: '',
    supervisoryAuthorityPhone: '',
    supervisoryAuthorityURI: '',
    isIntermediary: false,
    usesIntermediary: '',
  };
}

export function presetToForm(preset: any): FormData {
  return {
    legalName: preset.legalName ?? '',
    tradeName: preset.tradeName ?? '',
    identifierType: preset.identifier?.[0]?.type ?? '',
    identifierValue: preset.identifier?.[0]?.identifier ?? '',
    infoURI: (preset.infoURI ?? []).join(', '),
    email: preset.email ?? '',
    phone: preset.phone ?? '',
    supportURI: (preset.supportURI ?? []).join(', '),
    srvDescriptionLang: preset.srvDescription?.[0]?.lang ?? '',
    srvDescriptionContent: preset.srvDescription?.[0]?.content ?? '',
    intendedUse: JSON.stringify(preset.intendedUse ?? [], null, 2),
    isPSB: preset.isPSB ?? false,
    entitlement: (preset.entitlement ?? []).join('\n'),
    supervisoryAuthorityName: preset.supervisoryAuthority?.legalName ?? '',
    supervisoryAuthorityEmail: preset.supervisoryAuthority?.email ?? '',
    supervisoryAuthorityPhone: preset.supervisoryAuthority?.phone ?? '',
    supervisoryAuthorityURI: (preset.supervisoryAuthority?.infoURI ?? []).join(
      ', ',
    ),
    isIntermediary: preset.isIntermediary ?? false,
    usesIntermediary: preset.usesIntermediary
      ? JSON.stringify(preset.usesIntermediary, null, 2)
      : '',
  };
}

export function formToDto(form: FormData): any {
  const dto: any = {
    legalName: form.legalName,
    tradeName: form.tradeName || undefined,
    identifier: [{ type: form.identifierType, identifier: form.identifierValue }],
    infoURI: form.infoURI
      ? form.infoURI
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : undefined,
    email: form.email || undefined,
    phone: form.phone || undefined,
    supportURI: form.supportURI
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    srvDescription: [
      { lang: form.srvDescriptionLang, content: form.srvDescriptionContent },
    ],
    isPSB: form.isPSB,
    entitlement: form.entitlement
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean),
    supervisoryAuthority: {
      legalName: form.supervisoryAuthorityName,
      email: form.supervisoryAuthorityEmail || undefined,
      phone: form.supervisoryAuthorityPhone || undefined,
      infoURI: form.supervisoryAuthorityURI
        ? form.supervisoryAuthorityURI
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        : undefined,
    },
    isIntermediary: form.isIntermediary,
  };

  try {
    dto.intendedUse = JSON.parse(form.intendedUse);
  } catch {
    dto.intendedUse = [];
  }

  if (form.usesIntermediary.trim()) {
    try {
      dto.usesIntermediary = JSON.parse(form.usesIntermediary);
    } catch {
      /* skip */
    }
  }

  return dto;
}
