'use client';

/**
 * AntdProvider — ConfigProvider con tema verde ASISTEDCOS.
 * Color primario: #2d6b1a (verde bosque del logo).
 */

import React from 'react';
import { AntdRegistry } from '@ant-design/nextjs-registry';
import { ConfigProvider } from 'antd';
import esES from 'antd/locale/es_ES';

export default function AntdProvider({ children }: { children: React.ReactNode }) {
  return (
    <AntdRegistry>
      <ConfigProvider
        locale={esES}
        theme={{
          token: {
            colorPrimary:  '#2d6b1a',  // verde bosque — color del logo ASISTEDCOS
            colorLink:     '#2d6b1a',
            borderRadius:  8,
          },
          components: {
            Table: {
              headerBg:   '#f4f7f2',   // verde muy pálido para cabecera
              rowHoverBg: '#f0f7eb',   // hover verde suave
              fontSize:   13,
            },
            Card: {
              borderRadiusLG: 12,
            },
            Button: {
              borderRadius: 8,
            },
          },
        }}
      >
        {children}
      </ConfigProvider>
    </AntdRegistry>
  );
}
