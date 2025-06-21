from qiskit import QuantumCircuit, QuantumRegister, ClassicalRegister
from qiskit_aer import AerSimulator

#basis gates qubit pairs for ALice and Bob Each
# if 4096 then 4096 for alice and bob

    #Aer simulate it for number of qubits required size
    # Shots = qubits /4
def measure(qc,shots):
    simulator= AerSimulator()
    job= simulator.run(qc, shots=shots,memory= True)
    result = job.result()
    bitstrings = result.get_memory()

    finalstring=""
    for bitstring in bitstrings:
            finalstring+= bitstring

    
    finalstring= finalstring.replace(" ", "")
    return finalstring



def rng(qubits):
    
    qc= QuantumCircuit(4,4)
    for i in range(4):
        qc.h(i)

    qc.measure_all()
    return measure(qc,qubits//4)


def main():

    textsizelimit= 1024
    message= "HEY BRO HALOOOO"

    qubitpairs= textsizelimit *4
    paircounts=4

    Alicebasis= rng(qubitpairs)
    Bobbasis= rng(qubitpairs)

    # 0 2 4 6 Alice , 1 3 5 7 BOB ... Even Alice, Odd bob
    
    totalcircuitscount= qubitpairs// paircounts
    circuits=[]
    for i in range(totalcircuitscount):
        qc= QuantumCircuit(paircounts*2,paircounts*2)
        for j in range(paircounts):
             basisindex=i*4+j

             qc.h(j*2)
             qc.cx(j*2,j*2+1)

             if Alicebasis[basisindex]=='1' :
                 qc.h(j*2)
             if Bobbasis[basisindex]=='1':
                 qc.h(j*2+1)
                 
        qc.measure_all()
        circuits.append(qc)
             


                 


    #print(qc.draw())







if __name__== '__main__':
    main()
