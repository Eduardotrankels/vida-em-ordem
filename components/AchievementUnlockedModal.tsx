import React from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

export default function AchievementUnlockedModal({
visible,
achievement,
onClose
}: any) {

if (!achievement) return null;

return (

<Modal visible={visible} transparent animationType="fade">

<View style={styles.overlay}>

<View style={styles.card}>

<Text style={styles.icon}>
{achievement.icon}
</Text>

<Text style={styles.title}>
Nova conquista!
</Text>

<Text style={styles.name}>
{achievement.title}
</Text>

<Text style={styles.desc}>
{achievement.description}
</Text>

<Pressable style={styles.button} onPress={onClose}>
<Text style={styles.buttonText}>Continuar</Text>
</Pressable>

</View>

</View>

</Modal>

);
}

const styles = StyleSheet.create({

overlay:{
flex:1,
backgroundColor:"rgba(0,0,0,0.7)",
justifyContent:"center",
alignItems:"center"
},

card:{
backgroundColor:"#0b1730",
padding:30,
borderRadius:20,
alignItems:"center",
width:"80%"
},

icon:{
fontSize:50,
marginBottom:10
},

title:{
color:"#22c55e",
fontWeight:"800",
marginBottom:10
},

name:{
color:"white",
fontSize:20,
fontWeight:"900"
},

desc:{
color:"#94a3b8",
textAlign:"center",
marginTop:6,
marginBottom:20
},

button:{
backgroundColor:"#2563eb",
paddingHorizontal:25,
paddingVertical:10,
borderRadius:10
},

buttonText:{
color:"white",
fontWeight:"700"
}

});