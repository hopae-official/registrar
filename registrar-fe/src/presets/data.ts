// Preset data for demo flows

// --- Demo Users ---
export const demoUsers = [
  {
    label: 'Hopae Admin',
    description: 'Intermediary operator',
    email: 'admin@hopae.com',
    password: 'demo1234',
    name: 'Alice Kim',
    company: 'Hopae S.àr.l.',
  },
  {
    label: 'SmartID Admin',
    description: 'RP using intermediary',
    email: 'admin@smartid.com',
    password: 'demo1234',
    name: 'Bob Martin',
    company: 'SmartID Services S.àr.l.',
  },
  {
    label: 'LuxBank Admin',
    description: 'Normal RP operator',
    email: 'admin@luxbank.com',
    password: 'demo1234',
    name: 'Claire Dupont',
    company: 'LuxBank S.A.',
  },
];

// --- RP Presets ---

export const intermediaryPreset = {
  legalName: 'Hopae S.àr.l.',
  tradeName: 'Hopae',
  identifier: [{ type: 'EUID', value: 'LULUX.12345678' }],
  infoURI: ['https://hopae.com'],
  email: 'contact@hopae.com',
  phone: '+352-26-10-00-01',
  supportURI: ['https://support.hopae.com'],
  srvDescription: [
    {
      lang: 'en',
      content:
        'Technology intermediary providing wallet integration services for EU Digital Identity Wallet.',
    },
  ],
  intendedUse: [
    {
      purpose: [
        {
          lang: 'en',
          content:
            'Identity verification and credential processing on behalf of relying parties',
        },
      ],
      privacyPolicy: [{ type: 'text/html', uri: 'https://hopae.com/privacy' }],
      credential: [
        {
          format: 'vc+sd-jwt',
          meta: { vct_values: ['urn:eu.europa.ec.eudi:pid:1'] },
          claim: [{ path: ['given_name'] }, { path: ['family_name'] }],
        },
      ],
    },
  ],
  isPSB: false,
  entitlement: ['https://uri.etsi.org/19475/Entitlement/Service_Provider'],
  supervisoryAuthority: {
    legalName: 'CNPD',
    email: 'info@cnpd.lu',
    phone: '+352-26-10-60-1',
    infoURI: ['https://cnpd.public.lu'],
  },
  isIntermediary: true,
};

export const normalRPPreset = {
  legalName: 'LuxBank S.A.',
  tradeName: 'LuxBank',
  identifier: [{ type: 'EUID', value: 'LULUX.87654321' }],
  infoURI: ['https://luxbank.lu'],
  email: 'contact@luxbank.lu',
  phone: '+352-26-25-00-00',
  supportURI: ['https://support.luxbank.lu'],
  srvDescription: [
    {
      lang: 'en',
      content:
        'Digital banking services requiring identity verification for account opening and KYC compliance.',
    },
  ],
  intendedUse: [
    {
      purpose: [
        {
          lang: 'en',
          content:
            'Customer onboarding and KYC verification for banking services',
        },
      ],
      privacyPolicy: [{ type: 'text/html', uri: 'https://luxbank.lu/privacy' }],
      credential: [
        {
          format: 'vc+sd-jwt',
          meta: { vct_values: ['urn:eu.europa.ec.eudi:pid:1'] },
          claim: [
            { path: ['given_name'] },
            { path: ['family_name'] },
            { path: ['birth_date'] },
            { path: ['resident_address'] },
          ],
        },
      ],
    },
  ],
  isPSB: false,
  entitlement: ['https://uri.etsi.org/19475/Entitlement/Service_Provider'],
  supervisoryAuthority: {
    legalName: 'CSSF',
    email: 'info@cssf.lu',
    phone: '+352-26-25-1-1',
    infoURI: ['https://www.cssf.lu'],
  },
  isIntermediary: false,
};

export function rpWithIntermediaryPreset(intermediary: {
  identifier: { type: string; value: string }[];
  tradeName?: string;
  registryURI: string;
}) {
  return {
    legalName: 'SmartID Services S.àr.l.',
    tradeName: 'SmartID',
    identifier: [{ type: 'EUID', value: 'LULUX.11223344' }],
    infoURI: ['https://smartid.lu'],
    email: 'contact@smartid.lu',
    phone: '+352-26-30-00-00',
    supportURI: ['https://support.smartid.lu'],
    srvDescription: [
      {
        lang: 'en',
        content:
          'Online identity verification service using EU Digital Identity Wallet via intermediary.',
      },
    ],
    intendedUse: [
      {
        purpose: [
          {
            lang: 'en',
            content: 'Age verification and identity checks for online services',
          },
        ],
        privacyPolicy: [
          { type: 'text/html', uri: 'https://smartid.lu/privacy' },
        ],
        credential: [
          {
            format: 'vc+sd-jwt',
            meta: { vct_values: ['urn:eu.europa.ec.eudi:pid:1'] },
            claim: [{ path: ['age_over_18'] }],
          },
        ],
      },
    ],
    isPSB: false,
    entitlement: ['https://uri.etsi.org/19475/Entitlement/Service_Provider'],
    supervisoryAuthority: {
      legalName: 'CNPD',
      email: 'info@cnpd.lu',
      phone: '+352-26-10-60-1',
      infoURI: ['https://cnpd.public.lu'],
    },
    isIntermediary: false,
    usesIntermediary: [
      {
        identifier: intermediary.identifier,
        tradeName: intermediary.tradeName,
        registryURI: intermediary.registryURI,
      },
    ],
  };
}

// --- Certificate Presets ---

export const registrationCertPreset = {
  support_uri: 'https://support.example.lu',
  privacy_policy: 'https://example.lu/privacy-policy',
  purpose: [
    { lang: 'en', content: 'Identity verification for service access' },
  ],
  credentials: [
    {
      format: 'vc+sd-jwt',
      meta: { vct_values: ['urn:eu.europa.ec.eudi:pid:1'] },
      claim: [{ path: ['given_name'] }, { path: ['family_name'] }],
    },
  ],
};

export const accessCertPreset = {
  dns: ['verify.hopae.com', 'api.example.lu'],
};
