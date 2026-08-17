/**
 * LES QUATRE RACCORDS DU RÉGIME HAUTE RÉTENTION
 *
 * `zoomThrough` (scale-to-mask), `slideWhip`, `matchCut` et `diagonalSlash`
 * sont les seuls raccords autorisés sur la piste Blink. Le fondu enchaîné en
 * est banni : deux images superposées à 50 % ne sont ni l'une ni l'autre, et
 * cette demi-seconde d'indécision est exactement là où un spectateur décroche.
 *
 * `wipeUp` et `glassCut` restent disponibles pour les compositions paysage, qui
 * relèvent d'un autre langage — plus posé, façon keynote.
 */
export * from './diagonalSlash';
export * from './glassCut';
export * from './matchCut';
export * from './slideWhip';
export * from './whipPan';
export * from './wipeUp';
export * from './zoomThrough';
