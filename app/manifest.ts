import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'FlavorQuest - Trải Nghiệm Thuyết Minh Âm Thanh Tự Động',
    short_name: 'FlavorQuest',
    description:
      'Khám phá phố ẩm thực Vĩnh Khánh với thuyết minh âm thanh tự động dựa trên vị trí. Hỗ trợ 6 ngôn ngữ, hoạt động offline.',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#ef4444',
    orientation: 'portrait',
    scope: '/',
    categories: ['travel', 'food', 'tourism', 'education'],
    lang: 'vi',
    dir: 'ltr',
    icons: [
      {
        src: '/icons/icon-72x72.png',
        sizes: '72x72',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-96x96.png',
        sizes: '96x96',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-128x128.png',
        sizes: '128x128',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-144x144.png',
        sizes: '144x144',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-152x152.png',
        sizes: '152x152',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icons/icon-384x384.png',
        sizes: '384x384',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
    screenshots: [
      {
        src: '/screenshots/tour-map.png',
        sizes: '540x720',
        type: 'image/png',
        form_factor: 'narrow',
        label: 'Tour Map View',
      },
      {
        src: '/screenshots/poi-detail.png',
        sizes: '540x720',
        type: 'image/png',
        form_factor: 'narrow',
        label: 'POI Detail',
      },
    ],
    share_target: {
      action: '/share',
      method: 'GET',
      params: {
        title: 'title',
        text: 'text',
        url: 'url',
      },
    },
    shortcuts: [
      {
        name: 'Bắt đầu tour',
        short_name: 'Tour',
        description: 'Bắt đầu tour tự động',
        url: '/tour',
        icons: [{ src: '/icons/icon-96x96.png', sizes: '96x96' }],
      },
      {
        name: 'Xem bản đồ',
        short_name: 'Bản đồ',
        description: 'Xem bản đồ điểm tham quan',
        url: '/tour?view=map',
        icons: [{ src: '/icons/icon-96x96.png', sizes: '96x96' }],
      },
    ],
    related_applications: [],
    prefer_related_applications: false,
  };
}
