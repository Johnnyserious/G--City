'use client';
import { useMemo } from 'react';
import { avatarUri } from '@/lib/avatar';

export default function Avatar({ avatar, size = 48, className = '', style }) {
  const uri = useMemo(() => avatarUri(avatar), [JSON.stringify(avatar)]); // eslint-disable-line
  return <img className={'avatar ' + className} src={uri} width={size} height={size} alt="" style={style} draggable={false} />;
}
