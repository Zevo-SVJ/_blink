import type {CSSProperties} from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {fonts} from '@/design/typography';
import {STAGGER} from '@/motion/beats';
import {Pop} from '@/motion/kinetic/Pop';
import {useIdle} from '@/motion/kinetic/idle';
import {Grain} from '../background/Grain';

export type TypeBreathWord = {
	text: string;
	/** Multiplie la taille de base. Le mot clé écrase les mots de liaison. */
	scale?: number;
	color?: string;
};

export type TypeBreathProps = {
	words: (string | TypeBreathWord)[];
	background: string;
	color: string;
	/** Petite ligne au-dessus, pour ancrer sans voler la vedette. */
	kicker?: string;
	kickerColor?: string;
	/** Taille de base, en px. */
	size?: number;
	at?: number;
	/** Décalage entre deux mots, en frames. */
	step?: number;
	/** Frame de sortie. Sans elle, le texte reste jusqu'à la coupe. */
	out?: number;
	align?: CSSProperties['alignItems'];
	grain?: boolean;
};

const normalize = (word: string | TypeBreathWord): TypeBreathWord =>
	typeof word === 'string' ? {text: word} : word;

/**
 * RESPIRATION TYPOGRAPHIQUE — l'écran texte seul.
 *
 * Rôle : nettoyer la rétine. Après une scène dense, l'œil a besoin d'un plan
 * où il n'y a *rien* à explorer. Ces moments sont rares par construction — leur
 * force vient de leur rareté, pas de leur nombre.
 *
 * Les règles appliquées, toutes issues de l'analyse de la référence :
 *
 *   • **jamais plus de quatre mots**, souvent un ou deux ;
 *   • **graisse maximale** (800) et interlettrage très négatif ;
 *   • **marges massives** — au moins 20 % de vide de chaque côté ;
 *   • **contraste chromatique franc** avec la scène précédente : c'est la
 *     rupture de fond qui fait respirer, autant que le vide ;
 *   • **hiérarchie par l'échelle** : le mot clé fait le double des autres ;
 *   • **entrée en flou directionnel** qui se dissipe à l'arrêt ;
 *   • **jamais figé** : une très lente montée d'échelle continue après
 *     l'arrivée, sous le seuil de perception consciente.
 */
export const TypeBreath: React.FC<TypeBreathProps> = ({
	words,
	background,
	color,
	kicker,
	kickerColor,
	size = 150,
	at = 0,
	step = STAGGER.wide,
	out,
	align = 'center',
	grain = true,
}) => {
	const frame = useCurrentFrame();
	const idle = useIdle({float: 0, breathe: 0, speed: 0.1});

	// Montée d'échelle continue : +2,5 % sur toute la durée du plan. On ne la
	// voit pas, on la sent — c'est ce qui empêche l'écran de paraître gelé.
	const creep = interpolate(frame - at, [0, 150], [1, 1.025], {
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp',
	});

	return (
		<AbsoluteFill style={{backgroundColor: background}}>
			<AbsoluteFill
				style={{
					// Marges massives : le texte doit flotter, jamais toucher le bord.
					padding: '0 12%',
					display: 'flex',
					flexDirection: 'column',
					alignItems: align,
					justifyContent: 'center',
					gap: 18,
				}}
			>
				{kicker ? (
					<Pop at={at} spring="popSoft" preset="riseUp" out={out} exit="liftOut">
						<div
							style={{
								fontFamily: fonts.text,
								fontSize: 30,
								fontWeight: 700,
								letterSpacing: '0.22em',
								textTransform: 'uppercase',
								color: kickerColor ?? color,
								opacity: 0.55,
							}}
						>
							{kicker}
						</div>
					</Pop>
				) : null}

				<div
					style={{
						transform: `scale(${(creep * idle.scale).toFixed(4)})`,
						display: 'flex',
						flexDirection: 'column',
						alignItems: align,
						gap: 0,
					}}
				>
					{words.map(normalize).map((word, index) => (
						<Pop
							key={`${word.text}-${index}`}
							at={at + 3 + index * step}
							spring="textPop"
							preset={{opacity: 0, scale: 0.55, blur: 26, y: 26}}
							out={out === undefined ? undefined : out + index * 2}
							exit="crush"
							outDuration={14}
						>
							<div
								style={{
									fontFamily: fonts.display,
									fontSize: size * (word.scale ?? 1),
									fontWeight: 800,
									letterSpacing: '-0.055em',
									lineHeight: 0.94,
									color: word.color ?? color,
									textAlign: align === 'center' ? 'center' : 'left',
								}}
							>
								{word.text}
							</div>
						</Pop>
					))}
				</div>
			</AbsoluteFill>

			{grain ? <Grain opacity={0.04} /> : null}
		</AbsoluteFill>
	);
};
