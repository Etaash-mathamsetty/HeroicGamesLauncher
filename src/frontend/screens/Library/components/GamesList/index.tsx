import React, { useContext, useEffect } from 'react'
import { GameInfo, Runner, SideloadGame } from 'common/types'
import cx from 'classnames'
import GameCard from '../GameCard'
import ContextProvider from 'frontend/state/ContextProvider'
import { useTranslation } from 'react-i18next'

interface Props {
  library: (GameInfo | SideloadGame)[]
  layout?: string
  isFirstLane?: boolean
  handleGameCardClick: (
    app_name: string,
    runner: Runner,
    gameInfo: GameInfo
  ) => void
  onlyInstalled?: boolean
  isRecent?: boolean
}

const GamesList = ({
  library = [],
  layout = 'grid',
  handleGameCardClick,
  isFirstLane = false,
  onlyInstalled = false,
  isRecent = false
}: Props): JSX.Element => {
  const { gameUpdates } = useContext(ContextProvider)
  const { t } = useTranslation()

  useEffect(() => {
    if (library.length) {
      const options = {
        root: document.querySelector('.listing'),
        rootMargin: '500px',
        threshold: 0
      }

      const callback: IntersectionObserverCallback = (entries, observer) => {
        const entered: string[] = []
        entries.forEach((entry) => {
          if (entry.intersectionRatio > 0) {
            // when a card is intersecting the viewport
            const appName = (entry.target as HTMLDivElement).dataset
              .appName as string

            // store this appName for later
            entered.push(appName)
            // stop observing this element
            observer.unobserve(entry.target)
          }
        })

        // dispatch an event with the newley visible cards
        // check GameCard for the other side of this detection
        window.dispatchEvent(
          new CustomEvent('visible-cards', { detail: { appNames: entered } })
        )
      }

      const observer = new IntersectionObserver(callback, options)

      document.querySelectorAll('[data-invisible]').forEach((card) => {
        observer.observe(card)
      })

      return () => {
        observer.disconnect()
      }
    }
    return () => ({})
  }, [library])

  return (
    <div
      style={!library.length ? { backgroundColor: 'transparent' } : {}}
      className={cx({
        gameList: layout === 'grid',
        gameListLayout: layout === 'list',
        firstLane: isFirstLane
      })}
    >
      {layout === 'list' && (
        <div className="gameListHeader">
          <span>{t('game.title', 'Game Title')}</span>
          <span>{t('game.status', 'Status')}</span>
          <span>{t('game.store', 'Store')}</span>
          <span>{t('wine.actions', 'Action')}</span>
        </div>
      )}
      {!!library.length &&
        library.map((gameInfo) => {
          const { app_name, is_installed, runner } = gameInfo

          let is_dlc = false
          if (gameInfo.runner !== 'sideload') {
            is_dlc = gameInfo.install.is_dlc ?? false
          }

          if (is_dlc) {
            return null
          }
          if (!is_installed && onlyInstalled) {
            return null
          }

          const hasUpdate = is_installed && gameUpdates?.includes(app_name)
          return (
            <GameCard
              key={app_name}
              hasUpdate={hasUpdate}
              buttonClick={() => {
                if (gameInfo.runner !== 'sideload')
                  handleGameCardClick(app_name, runner, gameInfo)
              }}
              forceCard={layout === 'grid'}
              isRecent={isRecent}
              gameInfo={gameInfo}
            />
          )
        })}
    </div>
  )
}

export default React.memo(GamesList)
