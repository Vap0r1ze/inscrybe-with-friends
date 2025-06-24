import styles from './Rulebook.module.css';
import { Entry, EntrySegment, getEntryTagDisplay, openInRulebook, useEntryData, useRulebook } from '@/hooks/useRulebook';
import { Text } from './ui/Text';
import classNames from 'classnames';
import { SigilButton } from './inputs/SigilButton';
import { Sprite } from './sprites/Sprite';
import { Spritesheets } from '@/lib/spritesheets';
import { CardSprite } from './sprites/CardSprite';
import { rulesets } from '@/lib/defs/prints';
import { memo } from 'react';
import { AnimatePresence, motion } from 'motion/react';

export function Rulebook() {
    const entry = useRulebook(state => state.entry);
    const ruleset = useRulebook(state => state.currentRuleset);
    const entryData = useEntryData();

    return <AnimatePresence>
        {entry && <motion.div
            key="rulebook"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.1 }}
            className={styles.backdrop}
            onClick={useRulebook.getState().close}
        >
            <div className={classNames(styles.rulebook, {
                [styles.missing]: !entryData,
            })} onClick={event => event.stopPropagation()}>
                {entryData ? <>
                    <EntryDisplay entry={entry} ruleset={ruleset} />
                    <Text className={styles.title} size={12}>{entryData.title}</Text>
                    <div className={styles.description}>
                        <Text>
                            {entryData.description.map((segment, i) => (
                                <EntrySeg key={i} ruleset={ruleset} segment={segment} />
                            ))}
                        </Text>
                    </div>
                </> : (
                    <Text>Missing Entry ({ entry.id })</Text>
                )}
            </div>
        </motion.div>}
    </AnimatePresence>;
}

function EntrySeg({ segment, ruleset }: { ruleset: string, segment: EntrySegment }) {
    if (segment.type === 'text') return <>{segment.text}</>;
    if (segment.type === 'link') return (
        <span className={styles.link} onClick={() => openInRulebook(segment.tag)}>{getEntryTagDisplay(ruleset, segment.tag)}</span>
    );
    if (segment.type === 'value') return <span className={styles.value}>{segment.text}</span>;
    if (segment.type === 'break') return <br />;
    return null;
}

const EntryDisplay = memo(function EntryDisplay({ ruleset, entry }: { ruleset: string, entry: Entry }) {
    const display = (() => {
        if (entry.type === 'sigil') {
            const sigil = entry.id;
            return sigil.startsWith('activated')
                ? <SigilButton sigil={sigil} />
                : <Sprite sheet={Spritesheets.sigils} name={sigil} />;
        }
        if (entry.type === 'print') {
            const print = rulesets[ruleset].prints[entry.id];
            if (!print) return null;
            return <CardSprite print={print} />;
        }
    })();

    return display ? <div className={styles.display}>{display}</div> : null;
});
