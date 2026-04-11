'use client'

import React from 'react'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'

interface Props {
  title?: string
  secondaryTitle?: string
  thirdTitle?: string
  children?: React.ReactNode
}

const Layout = ({ title, secondaryTitle, thirdTitle, children }: Props) => {
  return (
    <Card sx={{ m: 2 }}>
      <CardContent>
        {title && (
          <Typography sx={{ fontSize: 28 }} color="text.secondary" gutterBottom>
            {title}
          </Typography>
        )}
        {secondaryTitle && (
          <Typography variant="h5" component="div">
            {secondaryTitle}
          </Typography>
        )}
        {thirdTitle && (
          <Typography sx={{ mb: 1.5 }} color="text.secondary">
            {thirdTitle}
          </Typography>
        )}
        <Typography variant="body2">{children}</Typography>
      </CardContent>
    </Card>
  )
}

export default Layout
