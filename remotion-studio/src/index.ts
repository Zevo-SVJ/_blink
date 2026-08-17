import {registerRoot} from 'remotion';
import {RemotionRoot} from './Root';

/**
 * Point d'entrée du bundle Remotion (studio et rendu).
 * Ce fichier ne doit contenir que l'enregistrement de la racine — tout le reste
 * vit dans `Root.tsx` et les compositions.
 */
registerRoot(RemotionRoot);
