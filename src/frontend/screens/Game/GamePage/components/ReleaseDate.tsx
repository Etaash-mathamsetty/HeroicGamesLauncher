import React, { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import GameContext from '../../GameContext'

type ReleaseDateProps = {
  date: string[] | undefined
}

// convert date to current locale using Intl module
function convertDate(date: string) {
  // Extract only the date part if the string contains extra information
  const match = date.match(/(\w+ \d{1,2}, \d{4})/)
  if (match) {
    date = match[1]
  }

  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }

  const dateObj = new Date(date)

  // Check if dateObj is a valid date
  if (isNaN(dateObj.getTime())) {
    return null
  }

  return dateObj.toLocaleDateString(undefined, options)
}

const ReleaseDate: React.FC<ReleaseDateProps> = ({ date }) => {
  const { is } = useContext(GameContext)

  const { t } = useTranslation()

  if (!date || date[0] === '' || date.length === 0) {
    return null
  }

  const getReleaseDate = () => {
    let windowsReleaseDate = ''

    for (let i = 0; i < date.length; i++) {
      const [platformName, releaseDate] = date[i].split(': ')

      if (platformName === 'Windows') {
        windowsReleaseDate = releaseDate
      }

      if (
        (platformName === 'Linux' && is.linuxNative && is.linux) ||
        (platformName === 'OS X' && is.macNative && is.mac)
      ) {
        return convertDate(releaseDate)
      }
    }

    return convertDate(windowsReleaseDate)
  }

  if (!getReleaseDate()) {
    return null
  }

  return (
    <div className="releaseDate">
      {t('label.releaseDate', 'Release Date')}: {getReleaseDate()}
    </div>
  )
}

export default ReleaseDate
