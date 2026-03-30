import { defineNavbarConfig } from 'vuepress-theme-plume'

export const zhNavbar = defineNavbarConfig([
    {
        text: '指南',
        icon: 'icon-park-outline:guide-board',
        items: [
            {
                text: '快速上手',
                items: [
                    {
                        text: '简介',
                        link: '/zh/notes/guide/basicinfo/intro.md',
                        icon: 'mdi:tooltip-text-outline',
                    },
                    {
                        text: '安装',
                        link: '/zh/notes/guide/basicinfo/install.md',
                        icon: 'material-symbols-light:download-rounded',
                    },
                    {
                        text: '架构设计',
                        link: '/zh/notes/guide/basicinfo/architecture.md',
                        icon: 'material-symbols:auto-transmission-sharp',
                    },
                ]
            },
            {
                text: '功能模块',
                items: [
                    {
                        text: 'RAG 向量检索',
                        link: '/zh/notes/guide/modules/rag.md',
                        icon: 'carbon:search-locate',
                    },
                    {
                        text: 'GraphRAG 图谱检索',
                        link: '/zh/notes/guide/modules/graphrag.md',
                        icon: 'carbon:chart-relationship',
                    },
                    {
                        text: 'Database 数据库查询',
                        link: '/zh/notes/guide/modules/database.md',
                        icon: 'carbon:data-table',
                    },
                ]
            },
        ]
    },
])
