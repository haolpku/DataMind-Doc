import { defineNavbarConfig } from 'vuepress-theme-plume'

export const enNavbar = defineNavbarConfig([
    {
        text: 'Guide',
        icon: 'icon-park-outline:guide-board',
        items: [
            {
                text: 'Getting Started',
                items: [
                    {
                        text: 'Introduction',
                        link: '/en/notes/guide/basicinfo/intro.md',
                        icon: 'mdi:tooltip-text-outline',
                    },
                    {
                        text: 'Installation',
                        link: '/en/notes/guide/basicinfo/install.md',
                        icon: 'material-symbols-light:download-rounded',
                    },
                    {
                        text: 'Architecture',
                        link: '/en/notes/guide/basicinfo/architecture.md',
                        icon: 'material-symbols:auto-transmission-sharp',
                    },
                ]
            },
            {
                text: 'Modules',
                items: [
                    {
                        text: 'RAG',
                        link: '/en/notes/guide/modules/rag.md',
                        icon: 'carbon:search-locate',
                    },
                    {
                        text: 'GraphRAG',
                        link: '/en/notes/guide/modules/graphrag.md',
                        icon: 'carbon:chart-relationship',
                    },
                    {
                        text: 'Database (NL2SQL)',
                        link: '/en/notes/guide/modules/database.md',
                        icon: 'carbon:data-table',
                    },
                ]
            },
        ]
    },
])
