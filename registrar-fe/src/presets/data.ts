// Preset data for demo flows

// --- Demo Users ---
export const demoUsers = [
  {
    label: 'Hopae Admin',
    description: 'Intermediary operator',
    email: 'admin@hopae.com',
    password: 'demo1234',
    name: 'Alice Kim',
    company: 'Hopae Inc.',
  },
  {
    label: 'SmartID Admin',
    description: 'RP using intermediary',
    email: 'admin@smartid.com',
    password: 'demo1234',
    name: 'Bob Martin',
    company: 'SmartID Services Inc.',
  },
  {
    label: 'DemoBank Admin',
    description: 'Normal RP operator',
    email: 'admin@demobank.com',
    password: 'demo1234',
    name: 'Claire Dupont',
    company: 'DemoBank Corp.',
  },
];

// --- RP Presets ---

export const intermediaryPreset = {
  legalName: 'Hopae Inc.',
  tradeName: 'Hopae',
  identifier: [{ type: 'EUID', identifier: 'DEMO.12345678' }],
  infoURI: ['https://hopae.com'],
  email: 'contact@hopae.com',
  phone: '+1-555-100-0001',
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
      privacyPolicy: [{ type: 'text/html', policyURI: 'https://hopae.com/privacy' }],
      credential: [
        {
          format: 'vc+sd-jwt',
          meta: { vct_values: ['urn:eudi:pid:1'] },
          claim: [{ path: ['given_name'] }, { path: ['family_name'] }],
        },
      ],
    },
  ],
  isPSB: false,
  entitlement: ['https://uri.etsi.org/19475/Entitlement/Service_Provider'],
  supervisoryAuthority: {
    legalName: 'Demo Authority',
    email: 'info@demo-authority.example.com',
    phone: '+1-555-100-0060',
    infoURI: ['https://demo-authority.example.com'],
  },
  isIntermediary: true,
};

export const normalRPPreset = {
  legalName: 'DemoBank Corp.',
  tradeName: 'DemoBank',
  identifier: [{ type: 'EUID', identifier: 'DEMO.87654321' }],
  infoURI: ['https://demobank.example.com'],
  email: 'contact@demobank.example.com',
  phone: '+1-555-250-0000',
  supportURI: ['https://support.demobank.example.com'],
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
      privacyPolicy: [
        { type: 'text/html', policyURI: 'https://demobank.example.com/privacy' },
      ],
      credential: [
        {
          format: 'vc+sd-jwt',
          meta: { vct_values: ['urn:eudi:pid:1'] },
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
    legalName: 'Demo Financial Authority',
    email: 'info@demo-fin-authority.example.com',
    phone: '+1-555-250-0011',
    infoURI: ['https://demo-fin-authority.example.com'],
  },
  isIntermediary: false,
};

export function rpWithIntermediaryPreset(intermediary: {
  identifier: { type: string; identifier: string }[];
  tradeName?: string;
  registryURI: string;
}) {
  return {
    legalName: 'SmartID Services Inc.',
    tradeName: 'SmartID',
    identifier: [{ type: 'EUID', identifier: 'DEMO.11223344' }],
    infoURI: ['https://smartid.example.com'],
    email: 'contact@smartid.example.com',
    phone: '+1-555-300-0000',
    supportURI: ['https://support.smartid.example.com'],
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
          { type: 'text/html', policyURI: 'https://smartid.example.com/privacy' },
        ],
        credential: [
          {
            format: 'vc+sd-jwt',
            meta: { vct_values: ['urn:eudi:pid:1'] },
            claim: [{ path: ['age_over_18'] }],
          },
        ],
      },
    ],
    isPSB: false,
    entitlement: ['https://uri.etsi.org/19475/Entitlement/Service_Provider'],
    supervisoryAuthority: {
      legalName: 'Demo Authority',
      email: 'info@demo-authority.example.com',
      phone: '+1-555-100-0060',
      infoURI: ['https://demo-authority.example.com'],
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

// --- Dummy Intermediaries ---
export const dummyIntermediaries = [
  {
    id: 'dummy-1',
    legalName: 'TrustBridge GmbH',
    tradeName: 'TrustBridge',
    identifier: [{ type: 'EUID', identifier: 'DEBER.90001001' }],
    registryURI: 'https://registry.example.eu/wrp/dummy-1',
  },
  {
    id: 'dummy-2',
    legalName: 'Nordic eID Solutions AB',
    tradeName: 'NordicID',
    identifier: [{ type: 'EUID', identifier: 'SESTO.80002002' }],
    registryURI: 'https://registry.example.eu/wrp/dummy-2',
  },
  {
    id: 'dummy-3',
    legalName: 'VeriFrance S.A.S.',
    tradeName: 'VeriFrance',
    identifier: [{ type: 'EUID', identifier: 'FRPAR.70003003' }],
    registryURI: 'https://registry.example.eu/wrp/dummy-3',
  },
  {
    id: 'dummy-4',
    legalName: 'Identità Digitale S.r.l.',
    tradeName: 'IDItalia',
    identifier: [{ type: 'EUID', identifier: 'ITROM.60004004' }],
    registryURI: 'https://registry.example.eu/wrp/dummy-4',
  },
  {
    id: 'dummy-5',
    legalName: 'Iberian Trust Services S.L.',
    tradeName: 'IberTrust',
    identifier: [{ type: 'EUID', identifier: 'ESMAD.50005005' }],
    registryURI: 'https://registry.example.eu/wrp/dummy-5',
  },
  {
    id: 'dummy-6',
    legalName: 'EuroSign B.V.',
    tradeName: 'EuroSign',
    identifier: [{ type: 'EUID', identifier: 'NLAMS.40006006' }],
    registryURI: 'https://registry.example.eu/wrp/dummy-6',
  },
  {
    id: 'dummy-7',
    legalName: 'WalletConnect Belgium S.A.',
    tradeName: 'WalletConnect BE',
    identifier: [{ type: 'EUID', identifier: 'BEBRU.30007007' }],
    registryURI: 'https://registry.example.eu/wrp/dummy-7',
  },
  {
    id: 'dummy-8',
    legalName: 'AuthVault OÜ',
    tradeName: 'AuthVault',
    identifier: [{ type: 'EUID', identifier: 'EETAL.20008008' }],
    registryURI: 'https://registry.example.eu/wrp/dummy-8',
  },
  {
    id: 'dummy-9',
    legalName: 'HellasTrust A.E.',
    tradeName: 'HellasTrust',
    identifier: [{ type: 'EUID', identifier: 'GRATH.10009009' }],
    registryURI: 'https://registry.example.eu/wrp/dummy-9',
  },
  {
    id: 'dummy-10',
    legalName: 'Alpine Digital AG',
    tradeName: 'AlpineID',
    identifier: [{ type: 'EUID', identifier: 'ATWIE.00010010' }],
    registryURI: 'https://registry.example.eu/wrp/dummy-10',
  },
];

// --- Certificate Presets ---

export const registrationCertPreset = {
  support_uri: 'https://support.example.com',
  privacy_policy: 'https://example.com/privacy-policy',
  purpose: [
    { lang: 'en', content: 'Identity verification for service access' },
  ],
  credentials: [
    {
      format: 'vc+sd-jwt',
      meta: { vct_values: ['urn:eudi:pid:1'] },
      claim: [
        { path: ['given_name'] },
        { path: ['family_name'] },
        { path: ['birth_date'] },
        { path: ['resident_address'] },
      ],
    },
  ],
};

export const credentialPresets = {
  pid: [
    {
      format: 'vc+sd-jwt',
      meta: { vct_values: ['urn:eudi:pid:1'] },
      claim: [
        { path: ['given_name'] },
        { path: ['family_name'] },
        { path: ['birth_date'] },
        { path: ['resident_address'] },
      ],
    },
  ],
  ageVerification: [
    {
      format: 'vc+sd-jwt',
      meta: { vct_values: ['urn:eudi:pid:1'] },
      claim: [{ path: ['age_over_18'] }],
    },
  ],
};

export const accessCertPreset = {
  dns: ['verify.hopae.com', 'api.example.com'],
};
