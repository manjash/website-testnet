import { Box } from 'components/OffsetBorder/Box'
import { ReactNode } from 'react'
import styles from './styles.module.css'

type Props = {
  index: number
  id: string
  question: string
  answer: ReactNode
}

export default function QuestionAnswer({ index, id, question, answer }: Props) {
  return (
    <Box behind={index % 2 ? 'bg-iflightorange' : 'bg-ifpink'}>
      <div className="p-12">
        <div id={id} className="font-extended text-[1.75rem] mb-4">
          {question}{' '}
          <a
            className={styles.directLink}
            aria-hidden="true"
            href={'#' + id}
            title="Direct link to question"
          >
            #
          </a>{' '}
        </div>
        <div className="font-favorit text-xl">{answer}</div>
      </div>
    </Box>
  )
}
